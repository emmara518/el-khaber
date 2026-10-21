/**
 * Avatar lifecycle service (WP-01).
 *
 * Owner-scoped profile images for the three roles (customer avatar,
 * technician avatar, merchant logo) on top of the INDEPENDENT
 * `AVATAR_STORAGE_PORT` (D1 — never the private proof port):
 *
 * 1. `uploadAvatar` (owner only) — validates bytes (size + magic +
 *    sharp decode + dimensions + re-encode), writes them under a
 *    SERVER-GENERATED key, binds the resulting PUBLIC URL to the
 *    caller's own profile row, and best-effort deletes the previous
 *    owned object. The client never chooses the key or URL.
 * 2. `deleteAvatar` (owner only, idempotent) — NULLs the reference and
 *    best-effort deletes the owned object. Absence is success (204).
 *
 * Auth model mirrors the existing profile flows: identity comes from
 * the verified JWT (userId + role checked by the controller's `@Roles`
 * AND re-checked here per kind); cross-account rows behave as missing
 * (uniform 404); every mutation step is audited.
 *
 * Failure compensation (D7):
 * - object stored but DB update failed → compensating delete of the
 *   new object (delete failure is logged, the original error wins),
 * - replacement keeps the old image unless the DB update succeeded,
 * - old objects that are legacy foreign URLs are NEVER deleted (not
 *   ours) — only `avatars/{userId}/…` keys are delete targets,
 * - failed old-object deletes are warn-logged + audited (orphan
 *   record for the WP-02 cleanup job) without failing the request.
 */

import { randomUUID } from 'node:crypto';

import { ERROR_CODE } from '@khabir/shared-types';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { ApiException, NotFoundException, RateLimitedException } from '../common/errors';
import { RateLimitService } from '../common/rate-limit/rate-limit.service';
import { PrismaService } from '../database/prisma.service';
import { validateAndProcessAvatarImage } from '../storage/avatar-image';
import { AVATAR_STORAGE_PORT, type AvatarStoragePort } from '../storage/avatar-storage.port';
import {
  avatarKeyFromPublicUrl,
  buildAvatarStorageKey,
  isAvatarKeyOwnedBy,
  isAvatarSizeAccepted,
} from '../storage/avatar-validation';
import {
  DEFAULT_AVATAR_LOCAL_PUBLIC_BASE,
  readAvatarStorageConfig,
} from '../storage/avatar.config';

export type AvatarOwnerKind = 'customer' | 'technician' | 'merchant';

export interface AvatarUploadInput {
  userId: string;
  kind: AvatarOwnerKind;
  bytes: Uint8Array;
  sizeBytes: number;
}

export interface AvatarUploadResult {
  publicUrl: string;
  key: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface AvatarDeleteResult {
  deleted: boolean;
}

function uploadRejected(message: string, status = 400): ApiException {
  return new ApiException(ERROR_CODE.UPLOAD_REJECTED, message, status);
}

@Injectable()
export class AvatarService {
  private readonly logger = new Logger(AvatarService.name);
  private readonly maxBytes: number;
  private readonly publicBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rateLimit: RateLimitService,
    @Inject(AVATAR_STORAGE_PORT) private readonly storage: AvatarStoragePort,
  ) {
    const config = readAvatarStorageConfig();
    this.maxBytes = config.maxBytes;
    this.publicBaseUrl = config.publicBaseUrl ?? DEFAULT_AVATAR_LOCAL_PUBLIC_BASE;
  }

  /**
   * Validates, stores, and binds a new profile image. Returns the public
   * URL persisted on the caller's profile row.
   */
  async uploadAvatar(input: AvatarUploadInput): Promise<AvatarUploadResult> {
    const limit = await this.rateLimit.checkLimit('avatar', `avatar:${input.userId}`);
    if (!limit.allowed) {
      throw new RateLimitedException('Too many avatar uploads. Try again later.');
    }

    if (!isAvatarSizeAccepted(input.sizeBytes, this.maxBytes)) {
      throw uploadRejected(
        `Image exceeds the maximum size of ${String(this.maxBytes)} bytes.`,
        input.sizeBytes > this.maxBytes ? 413 : 400,
      );
    }

    const processed = await validateAndProcessAvatarImage(input.bytes);
    const key = buildAvatarStorageKey(input.userId, processed.mimeType, randomUUID());
    // Fail fast on misconfigured public reads BEFORE storing bytes, so a
    // missing AVATAR_PUBLIC_BASE_URL can never strand an orphan object.
    const publicUrl = this.storage.getPublicUrl(key);

    await this.storage.putBuffer(key, processed.bytes, processed.mimeType);

    const previous = await this.readCurrentUrl(input.userId, input.kind);
    try {
      await this.writeCurrentUrl(input.userId, input.kind, publicUrl);
    } catch (error) {
      await this.compensateNewObject(key, input.userId);
      throw error;
    }

    await this.audit.log({
      actorUserId: input.userId,
      entityType: `${input.kind}_profile`,
      entityId: input.userId,
      action: `${input.kind}.avatar.upload`,
      after: {
        mimeType: processed.mimeType,
        width: processed.width,
        height: processed.height,
      },
    });

    await this.deleteOwnedPrevious(previous, publicUrl, input.userId, input.kind);

    return {
      publicUrl,
      key,
      mimeType: processed.mimeType,
      width: processed.width,
      height: processed.height,
    };
  }

  /**
   * Removes the caller's profile image. Idempotent: absence is success.
   * The reference is NULLed first; the owned object delete is
   * best-effort (its failure is recorded, never surfaced as a request
   * failure).
   */
  async deleteAvatar(userId: string, kind: AvatarOwnerKind): Promise<AvatarDeleteResult> {
    const previous = await this.readCurrentUrl(userId, kind);
    if (previous === null) {
      return { deleted: false };
    }

    await this.writeCurrentUrl(userId, kind, null);

    await this.audit.log({
      actorUserId: userId,
      entityType: `${kind}_profile`,
      entityId: userId,
      action: `${kind}.avatar.delete`,
    });

    const key = avatarKeyFromPublicUrl(previous, this.publicBaseUrl);
    if (key !== null && isAvatarKeyOwnedBy(key, userId)) {
      try {
        await this.storage.delete(key);
      } catch (error) {
        this.recordOrphan(userId, kind, key, 'delete_failed', error);
      }
    }
    // Legacy foreign URLs (or unresolvable values) are read-only
    // history: the reference is already NULL, nothing else to do.

    return { deleted: true };
  }

  /**
   * Resolves a stored avatar reference back to an owned storage key.
   * Returns null for absent values and legacy foreign URLs. Used by the
   * WP-02 orphan-reconciliation job (documented, not scheduled here).
   */
  async resolveOwnedKey(userId: string, storedUrl: string | null): Promise<string | null> {
    if (storedUrl === null) {
      return null;
    }
    const key = avatarKeyFromPublicUrl(storedUrl, this.publicBaseUrl);
    if (key === null || !isAvatarKeyOwnedBy(key, userId)) {
      return null;
    }
    return key;
  }

  private async compensateNewObject(key: string, userId: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.recordOrphan(userId, 'customer', key, 'compensate_failed', error);
    }
  }

  private async deleteOwnedPrevious(
    previous: string | null,
    current: string,
    userId: string,
    kind: AvatarOwnerKind,
  ): Promise<void> {
    if (previous === null || previous === current) {
      return;
    }
    const key = avatarKeyFromPublicUrl(previous, this.publicBaseUrl);
    if (key === null || !isAvatarKeyOwnedBy(key, userId)) {
      return;
    }
    try {
      await this.storage.delete(key);
    } catch (error) {
      this.recordOrphan(userId, kind, key, 'replace_cleanup_failed', error);
    }
  }

  private recordOrphan(
    userId: string,
    kind: AvatarOwnerKind,
    key: string,
    reason: string,
    error: unknown,
  ): void {
    this.logger.warn(
      JSON.stringify({
        event: 'avatar_orphan',
        reason,
        kind,
        key,
        error: error instanceof Error ? error.message : 'unknown',
      }),
    );
    void this.audit
      .log({
        actorUserId: userId,
        entityType: `${kind}_profile`,
        entityId: userId,
        action: `${kind}.avatar.orphan_${reason}`,
        after: { key },
      })
      .catch(() => undefined);
  }

  private async readCurrentUrl(userId: string, kind: AvatarOwnerKind): Promise<string | null> {
    if (kind === 'customer') {
      const row = await this.prisma.customerProfile.findFirst({
        where: { userId },
        select: { avatarUrl: true },
      });
      return row?.avatarUrl ?? null;
    }
    if (kind === 'technician') {
      const row = await this.prisma.technicianProfile.findFirst({
        where: { userId },
        select: { avatarUrl: true },
      });
      return row?.avatarUrl ?? null;
    }
    const row = await this.prisma.merchantProfile.findFirst({
      where: { userId },
      select: { logoUrl: true },
    });
    return row?.logoUrl ?? null;
  }

  private async writeCurrentUrl(
    userId: string,
    kind: AvatarOwnerKind,
    url: string | null,
  ): Promise<void> {
    if (kind === 'customer') {
      // The customer profile row is created lazily (registration creates
      // the USER only), so the first avatar upload bootstraps it.
      await this.prisma.customerProfile.upsert({
        where: { userId },
        create: { userId, avatarUrl: url },
        update: { avatarUrl: url },
      });
      return;
    }
    if (kind === 'technician') {
      const profileId = await this.resolveTechnicianProfileId(userId);
      const updated = await this.prisma.technicianProfile.updateMany({
        where: { id: profileId, userId },
        data: { avatarUrl: url },
      });
      if (updated.count === 0) {
        throw new NotFoundException('Technician profile not found');
      }
      return;
    }
    const existing = await this.prisma.merchantProfile.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (existing === null) {
      // Onboarding persistence mirrors PATCH /merchant/profile: the
      // first write creates the pending profile.
      await this.prisma.merchantProfile.create({ data: { userId, logoUrl: url } });
      return;
    }
    const updated = await this.prisma.merchantProfile.updateMany({
      where: { id: existing.id, userId },
      data: { logoUrl: url },
    });
    if (updated.count === 0) {
      throw new NotFoundException('Merchant profile not found');
    }
  }

  private async resolveTechnicianProfileId(userId: string): Promise<string> {
    const existing = await this.prisma.technicianProfile.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (existing !== null) {
      return existing.id;
    }
    const created = await this.prisma.technicianProfile.create({
      data: { userId },
      select: { id: true },
    });
    return created.id;
  }
}
