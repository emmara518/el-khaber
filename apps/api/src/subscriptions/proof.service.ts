/**
 * Payment-proof lifecycle service (PHASE 20).
 *
 * Provider-abstracted, production-safe proof handling on top of the
 * StoragePort (`src/storage`):
 *
 * 1. `requestUploadUrl` (owner only) — issues a presigned PUT for a
 *    SERVER-GENERATED key. The client never chooses the key.
 * 2. `confirmProof` (owner only) — validates the uploaded object exists
 *    (HEAD: size + MIME) and sniffs magic bytes, then atomically binds the
 *    key to the still-pending submission. Client-supplied keys MUST match
 *    the caller's own submission prefix (arbitrary URL injection rejected).
 * 3. `adminProofUrl` (admin only) — short-lived presigned GET for review.
 *
 * Auth model mirrors the existing payment flows: cross-account submissions
 * behave as missing (uniform 404), reviewed submissions are stale (409),
 * and every mutation step is audited on `payment_submission`.
 */

import { randomUUID } from 'node:crypto';

import { ERROR_CODE } from '@khabir/shared-types';
import { Inject, Injectable } from '@nestjs/common';

import { AuditService } from '../audit/audit.service';
import { ApiException } from '../common/errors';
import { ConflictException, NotFoundException, ValidationException } from '../common/errors';
import { PrismaService } from '../database/prisma.service';
import {
  buildProofStorageKey,
  detectMimeFromMagicBytes,
  isAllowedProofMime,
  isKeyOwnedBy,
  isProofSizeAccepted,
  type ProofMimeType,
} from '../storage/proof-validation';
import { readProofStorageConfig } from '../storage/proof.config';
import { STORAGE_PORT, type StoragePort } from '../storage/storage.port';

const MAGIC_BYTES_TO_READ = 12;

function uploadRejected(message: string): ApiException {
  return new ApiException(ERROR_CODE.UPLOAD_REJECTED, message, 400);
}

@Injectable()
export class ProofService {
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
    submissionId: string,
    mimeType: string,
  ): Promise<Record<string, unknown>> {
    const normalized = mimeType.trim().toLowerCase();
    if (!isAllowedProofMime(normalized)) {
      throw new ValidationException('Unsupported proof MIME type', {
        mime_type: 'Must be one of image/jpeg, image/png, image/webp',
      });
    }
    await this.requireOwnedPending(userId, submissionId);

    const key = buildProofStorageKey(userId, submissionId, normalized, randomUUID());
    const grant = await this.storage.presignPut(key, normalized);

    await this.audit.log({
      actorUserId: userId,
      entityType: 'payment_submission',
      entityId: submissionId,
      action: 'user.payment.proof_upload_url',
      after: { storageKey: key, mimeType: normalized },
    });

    return {
      submissionId,
      storageKey: grant.key,
      uploadUrl: grant.url,
      requiredHeaders: grant.requiredHeaders,
      mimeType: normalized,
      maxBytes: grant.maxBytes,
      expiresInSeconds: grant.expiresInSeconds,
    };
  }

  /**
   * Owner-only confirm: HEAD-validates the object (existence/size/MIME),
   * verifies magic bytes, and atomically binds the key to the submission.
   * The supplied key MUST live under the caller's own submission prefix.
   */
  async confirmProof(
    userId: string,
    submissionId: string,
    storageKey: string,
  ): Promise<Record<string, unknown>> {
    await this.requireOwnedPending(userId, submissionId);

    if (!isKeyOwnedBy(storageKey, userId, submissionId)) {
      throw uploadRejected('Storage key is not valid for this submission');
    }

    const { maxBytes } = readProofStorageConfig();
    const header = await this.storage.head(storageKey);
    if (!header.exists) {
      throw uploadRejected('No uploaded proof found for this key — upload the file first');
    }
    if (header.sizeBytes === null || !isProofSizeAccepted(header.sizeBytes, maxBytes)) {
      throw uploadRejected(`Proof size is not accepted (max ${maxBytes} bytes)`);
    }
    const declared = header.mimeType?.trim().toLowerCase() ?? null;
    if (declared !== null && !isAllowedProofMime(declared)) {
      throw uploadRejected('Uploaded proof has an unsupported MIME type');
    }

    const prefix = await this.storage.readPrefix(storageKey, MAGIC_BYTES_TO_READ);
    if (prefix === null) {
      throw uploadRejected('Uploaded proof could not be read — upload the file first');
    }
    const sniffed = detectMimeFromMagicBytes(prefix);
    if (sniffed === null) {
      throw uploadRejected('Uploaded file is not a supported image (magic-byte check failed)');
    }
    if (declared !== null && sniffed !== declared) {
      throw uploadRejected('Uploaded content does not match its declared MIME type');
    }
    const mimeType: ProofMimeType = sniffed;

    const now = new Date();
    const claimed = await this.prisma.paymentSubmission.updateMany({
      where: { id: submissionId, status: 'pending' },
      data: {
        proofStorageKey: storageKey,
        proofMimeType: mimeType,
        proofByteSize: header.sizeBytes,
        proofConfirmedAt: now,
      },
    });
    if (claimed.count === 0) {
      throw new ConflictException('Payment submission has already been reviewed');
    }

    await this.audit.log({
      actorUserId: userId,
      entityType: 'payment_submission',
      entityId: submissionId,
      action: 'user.payment.proof_confirm',
      after: { storageKey, mimeType, sizeBytes: header.sizeBytes },
    });

    return {
      id: submissionId,
      status: 'pending',
      proofStorageKey: storageKey,
      proofMimeType: mimeType,
      proofByteSize: header.sizeBytes,
      proofConfirmedAt: now.toISOString(),
    };
  }

  /** Admin-only short-lived presigned GET for proof review. */
  async adminProofUrl(adminId: string, submissionId: string): Promise<Record<string, unknown>> {
    const submission = await this.prisma.paymentSubmission.findFirst({
      where: { id: submissionId },
      select: { id: true, proofStorageKey: true },
    });
    if (submission === null) {
      throw new NotFoundException('Payment submission not found');
    }
    if (submission.proofStorageKey === null) {
      throw new NotFoundException('No proof attached to this submission');
    }
    const grant = await this.storage.presignGet(submission.proofStorageKey);

    await this.audit.log({
      actorAdminId: adminId,
      entityType: 'payment_submission',
      entityId: submissionId,
      action: 'admin.payment.proof_view',
      after: { storageKey: submission.proofStorageKey },
    });

    return {
      submissionId,
      storageKey: grant.key,
      downloadUrl: grant.url,
      expiresInSeconds: grant.expiresInSeconds,
    };
  }

  /** Loads the submission or throws uniform 404 / stale 409. */
  private async requireOwnedPending(
    userId: string,
    submissionId: string,
  ): Promise<{ id: string; userId: string; status: string }> {
    const submission = await this.prisma.paymentSubmission.findFirst({
      where: { id: submissionId },
      select: { id: true, userId: true, status: true },
    });
    if (submission === null || submission.userId !== userId) {
      throw new NotFoundException('Payment submission not found');
    }
    if (submission.status !== 'pending') {
      throw new ConflictException('Payment submission has already been reviewed');
    }
    return submission;
  }
}
