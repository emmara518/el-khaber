/**
 * Service-request media service (Track B2).
 *
 * Customer-attached problem photos on top of the shared StoragePort
 * (PHASE 20) — private objects, presigned PUT/GET, SERVER-generated keys:
 *
 * 1. `requestUploadUrl` (customer owner) — presigned PUT for a
 *    server-generated key under `request-media/{userId}/{requestId}/`.
 *    The client never chooses the key. Also fails fast when the
 *    per-request attachment limit is already reached.
 * 2. `confirmMedia` (customer owner) — validates the uploaded object
 *    (HEAD: size + MIME) and sniffs magic bytes, then records the
 *    `service_request_media` row. Rejected uploads are deleted on a
 *    best-effort basis so no unreferenced object lingers.
 * 3. `listMedia` / `mediaUrl` (participants: request owner or
 *    targeted/assigned technician) — metadata without storage keys and
 *    short-lived presigned GETs for viewing. Views are audited.
 *
 * Auth model mirrors the service-request flow: cross-account requests
 * behave as missing (uniform 404); a cancelled request refuses new media
 * (409); every media step is audited on `service_request`.
 */

import { randomUUID } from 'node:crypto';

import { ERROR_CODE } from '@khabir/shared-types';
import { Inject, Injectable } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { ApiException, ConflictException, NotFoundException } from '../common/errors';
import { ValidationException } from '../common/errors';
import { PrismaService } from '../database/prisma.service';
import { readRequestMediaConfig } from '../storage/request-media.config';
import {
  buildRequestMediaStorageKey,
  detectMimeFromMagicBytes,
  isAllowedRequestMediaMime,
  isMediaKeyOwnedBy,
  isRequestMediaSizeAccepted,
  type RequestMediaMimeType,
} from '../storage/request-media-validation';
import { STORAGE_PORT, type StoragePort } from '../storage/storage.port';

import type { Prisma } from '@prisma/client';
import type { Role } from '@khabir/shared-types';

const MAGIC_BYTES_TO_READ = 12;
const MEDIA_LIST_BOUND = 50;

/** Minimal read model returned to participants (never exposes keys). */
export interface RequestMediaItem {
  readonly id: string;
  readonly mimeType: string;
  readonly fileSize: number;
  readonly createdAt: string;
}

function uploadRejected(message: string): ApiException {
  return new ApiException(ERROR_CODE.UPLOAD_REJECTED, message, 400);
}

@Injectable()
export class RequestMediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  /**
   * Owner-only presigned PUT grant. Returns the upload URL plus the
   * server-generated storage key the client MUST upload to.
   */
  async requestUploadUrl(
    userId: string,
    requestId: string,
    mimeType: string,
  ): Promise<Record<string, unknown>> {
    const normalized = mimeType.trim().toLowerCase();
    if (!isAllowedRequestMediaMime(normalized)) {
      throw new ValidationException('Unsupported photo MIME type', {
        mime_type: 'Must be one of image/jpeg, image/png, image/webp',
      });
    }
    await this.requireOwnedRequest(userId, requestId);
    await this.assertUnderLimit(requestId);

    const key = buildRequestMediaStorageKey(userId, requestId, normalized, randomUUID());
    const grant = await this.storage.presignPut(key, normalized);
    const { maxBytes } = readRequestMediaConfig();

    await this.audit.log({
      actorUserId: userId,
      entityType: 'service_request',
      entityId: requestId,
      action: 'user.service_request.media_upload_url',
      after: { storageKey: key, mimeType: normalized },
    });

    return {
      requestId,
      storageKey: grant.key,
      uploadUrl: grant.url,
      requiredHeaders: grant.requiredHeaders,
      mimeType: normalized,
      maxBytes,
      expiresInSeconds: grant.expiresInSeconds,
    };
  }

  /**
   * Owner-only confirm: HEAD-validates the object, verifies magic bytes,
   * enforces the per-request limit atomically, and records the media row.
   * Rejected uploads (after the object exists) are deleted best-effort.
   */
  async confirmMedia(
    userId: string,
    requestId: string,
    storageKey: string,
  ): Promise<RequestMediaItem> {
    await this.requireOwnedRequest(userId, requestId);

    if (!isMediaKeyOwnedBy(storageKey, userId, requestId)) {
      throw uploadRejected('Storage key is not valid for this request');
    }

    const { maxBytes, maxPerRequest } = readRequestMediaConfig();
    const header = await this.storage.head(storageKey);
    if (!header.exists) {
      throw uploadRejected('No uploaded photo found for this key — upload the file first');
    }

    try {
      if (header.sizeBytes === null || !isRequestMediaSizeAccepted(header.sizeBytes, maxBytes)) {
        throw uploadRejected(`Photo size is not accepted (max ${maxBytes} bytes)`);
      }
      const declared = header.mimeType?.trim().toLowerCase() ?? null;
      if (declared !== null && !isAllowedRequestMediaMime(declared)) {
        throw uploadRejected('Uploaded photo has an unsupported MIME type');
      }

      const prefix = await this.storage.readPrefix(storageKey, MAGIC_BYTES_TO_READ);
      if (prefix === null) {
        throw uploadRejected('Uploaded photo could not be read — upload the file first');
      }
      const sniffed = detectMimeFromMagicBytes(prefix);
      if (sniffed === null) {
        throw uploadRejected('Uploaded file is not a supported image (magic-byte check failed)');
      }
      if (declared !== null && sniffed !== declared) {
        throw uploadRejected('Uploaded content does not match its declared MIME type');
      }
      const mimeType: RequestMediaMimeType = sniffed;

      const created = await this.prisma.$transaction(async (tx) => {
        const count = await tx.serviceRequestMedia.count({ where: { serviceRequestId: requestId } });
        if (count >= maxPerRequest) {
          throw new ConflictException(`At most ${maxPerRequest} photos per request`);
        }
        return tx.serviceRequestMedia.create({
          data: {
            serviceRequestId: requestId,
            uploadedByUserId: userId,
            storageKey,
            mimeType,
            fileSize: header.sizeBytes as number,
          },
        });
      });

      await this.audit.log({
        actorUserId: userId,
        entityType: 'service_request',
        entityId: requestId,
        action: 'user.service_request.media_confirm',
        after: { mediaId: created.id, storageKey, mimeType, sizeBytes: created.fileSize },
      });

      return {
        id: created.id,
        mimeType: created.mimeType,
        fileSize: created.fileSize,
        createdAt: created.createdAt.toISOString(),
      };
    } catch (error) {
      // The object exists (HEAD succeeded) but was not bound to a row:
      // remove it so no unreferenced private object lingers.
      await this.storage.delete(storageKey).catch(() => undefined);
      throw error;
    }
  }

  /** Participant-visible media metadata (no storage keys, bounded). */
  async listMedia(userId: string, role: Role, requestId: string): Promise<RequestMediaItem[]> {
    await this.requireVisibleRequest(userId, role, requestId);
    const rows = await this.prisma.serviceRequestMedia.findMany({
      where: { serviceRequestId: requestId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: MEDIA_LIST_BOUND,
      select: { id: true, mimeType: true, fileSize: true, createdAt: true },
    });
    return rows.map((row) => ({
      id: row.id,
      mimeType: row.mimeType,
      fileSize: row.fileSize,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /** Participant-only short-lived presigned GET for viewing one photo. */
  async mediaUrl(
    userId: string,
    role: Role,
    requestId: string,
    mediaId: string,
  ): Promise<Record<string, unknown>> {
    await this.requireVisibleRequest(userId, role, requestId);
    const row = await this.prisma.serviceRequestMedia.findFirst({
      where: { id: mediaId, serviceRequestId: requestId },
      select: { id: true, storageKey: true },
    });
    if (row === null) {
      throw new NotFoundException('Photo not found');
    }
    const grant = await this.storage.presignGet(row.storageKey);

    await this.audit.log({
      actorUserId: userId,
      entityType: 'service_request',
      entityId: requestId,
      action: 'user.service_request.media_view',
      after: { mediaId: row.id, storageKey: row.storageKey },
    });

    return {
      mediaId: row.id,
      downloadUrl: grant.url,
      expiresInSeconds: grant.expiresInSeconds,
    };
  }

  /** Owner scope: only the request's customer may attach photos. */
  private async requireOwnedRequest(
    userId: string,
    requestId: string,
  ): Promise<{ id: string; status: string }> {
    const row = await this.prisma.serviceRequest.findFirst({
      where: { id: requestId, customerId: userId },
      select: { id: true, status: true },
    });
    if (row === null) {
      // Cross-account access is indistinguishable from a missing request.
      throw new NotFoundException('Service request not found');
    }
    if (row.status === 'cancelled') {
      throw new ConflictException('Service request is cancelled');
    }
    return row;
  }

  /**
   * Participant scope mirrors `ServiceRequestsService.detail()`: the
   * owner, or the targeted/assigned technician (identical 404 otherwise).
   */
  private async requireVisibleRequest(
    userId: string,
    role: Role,
    requestId: string,
  ): Promise<void> {
    let scope: Prisma.ServiceRequestWhereInput;
    if (role === 'customer') {
      scope = { id: requestId, customerId: userId };
    } else if (role === 'technician') {
      const profile = await this.prisma.technicianProfile.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (profile === null) {
        throw new NotFoundException('Service request not found');
      }
      scope = {
        id: requestId,
        OR: [{ technicianId: profile.id }, { status: 'pending', technicianId: profile.id }],
      };
    } else {
      throw new NotFoundException('Service request not found');
    }
    const row = await this.prisma.serviceRequest.findFirst({ where: scope, select: { id: true } });
    if (row === null) {
      throw new NotFoundException('Service request not found');
    }
  }

  private async assertUnderLimit(requestId: string): Promise<void> {
    const { maxPerRequest } = readRequestMediaConfig();
    const count = await this.prisma.serviceRequestMedia.count({
      where: { serviceRequestId: requestId },
    });
    if (count >= maxPerRequest) {
      throw new ConflictException(`At most ${maxPerRequest} photos per request`);
    }
  }
}
