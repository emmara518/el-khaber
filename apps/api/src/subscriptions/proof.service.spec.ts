/**
 * Unit tests for the payment-proof lifecycle (PHASE 20).
 *
 * The S3 client is fully mocked (no credentials, no network): ownership,
 * key-prefix, MIME/size, and magic-byte rules are verified against a stub
 * StoragePort. S3 signing behavior itself is covered by the adapter's
 * fail-closed contract, not by live calls.
 */

import 'reflect-metadata';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProofService } from './proof.service';

import type { StoragePort } from '../storage/storage.port';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER_USER = '22222222-2222-4222-8222-222222222222';
const SUBMISSION = '33333333-3333-4333-8333-333333333333';
const KEY = `payment-proofs/${USER}/${SUBMISSION}/123e4567-e89b-42d3-a456-426614174000.png`;

const PNG_PREFIX = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_PREFIX = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PDF_PREFIX = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0]);

interface Mocks {
  service: ProofService;
  findFirst: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  auditLog: ReturnType<typeof vi.fn>;
  storage: {
    presignPut: ReturnType<typeof vi.fn>;
    presignGet: ReturnType<typeof vi.fn>;
    head: ReturnType<typeof vi.fn>;
    readPrefix: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

function createService(): Mocks {
  const findFirst = vi.fn();
  const updateMany = vi.fn();
  const auditLog = vi.fn().mockResolvedValue(undefined);
  const storage = {
    provider: 'local' as const,
    presignPut: vi.fn(async (key: string, mime: string) => ({
      url: `local://${key}`,
      key,
      expiresInSeconds: 300,
      requiredHeaders: { 'Content-Type': mime },
      maxBytes: 5 * 1024 * 1024,
    })),
    presignGet: vi.fn(async (key: string) => ({
      url: `local://${key}`,
      key,
      expiresInSeconds: 300,
    })),
    head: vi.fn(async () => ({ exists: true, sizeBytes: 1024, mimeType: 'image/png' })),
    readPrefix: vi.fn(async () => PNG_PREFIX),
    delete: vi.fn(async () => undefined),
  };
  const prisma = { paymentSubmission: { findFirst, updateMany } };
  const audit = { log: auditLog };
  const service = new ProofService(
    prisma as never,
    audit as never,
    storage as unknown as StoragePort,
  );
  return { service, findFirst, updateMany, auditLog, storage };
}

function pendingSubmission(userId: string = USER): Record<string, unknown> {
  return { id: SUBMISSION, userId, status: 'pending' };
}

describe('requestUploadUrl', () => {
  let mocks: Mocks;

  beforeEach(() => {
    mocks = createService();
    mocks.findFirst.mockResolvedValue(pendingSubmission());
  });

  it('issues a presigned PUT for a server-generated key (owner, pending)', async () => {
    const result = await mocks.service.requestUploadUrl(USER, SUBMISSION, 'image/png');

    expect(mocks.storage.presignPut).toHaveBeenCalledOnce();
    const [key, mime] = mocks.storage.presignPut.mock.calls[0] as [string, string];
    expect(mime).toBe('image/png');
    expect(key.startsWith(`payment-proofs/${USER}/${SUBMISSION}/`)).toBe(true);
    expect(key.endsWith('.png')).toBe(true);
    expect(result).toMatchObject({ submissionId: SUBMISSION, storageKey: key, mimeType: 'image/png' });
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.payment.proof_upload_url', entityId: SUBMISSION }),
    );
  });

  it('rejects non-allowlisted MIME types (400)', async () => {
    await expect(mocks.service.requestUploadUrl(USER, SUBMISSION, 'image/gif')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      status: 400,
    });
    expect(mocks.storage.presignPut).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown or foreign-owned submissions', async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(mocks.service.requestUploadUrl(USER, SUBMISSION, 'image/png')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });

    mocks.findFirst.mockResolvedValue(pendingSubmission(OTHER_USER));
    await expect(mocks.service.requestUploadUrl(USER, SUBMISSION, 'image/png')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('returns 409 for already-reviewed submissions', async () => {
    mocks.findFirst.mockResolvedValue({ id: SUBMISSION, userId: USER, status: 'approved' });
    await expect(mocks.service.requestUploadUrl(USER, SUBMISSION, 'image/png')).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });
  });
});

describe('confirmProof', () => {
  let mocks: Mocks;

  beforeEach(() => {
    mocks = createService();
    mocks.findFirst.mockResolvedValue(pendingSubmission());
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it('HEAD-validates, sniffs magic bytes, and atomically binds the key', async () => {
    const result = await mocks.service.confirmProof(USER, SUBMISSION, KEY);

    expect(mocks.storage.head).toHaveBeenCalledWith(KEY);
    expect(mocks.storage.readPrefix).toHaveBeenCalledWith(KEY, 12);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: SUBMISSION, status: 'pending' },
      data: expect.objectContaining({
        proofStorageKey: KEY,
        proofMimeType: 'image/png',
        proofByteSize: 1024,
      }),
    });
    expect(result).toMatchObject({ id: SUBMISSION, proofStorageKey: KEY, proofMimeType: 'image/png' });
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.payment.proof_confirm', entityId: SUBMISSION }),
    );
  });

  it('rejects arbitrary URL injection and foreign keys (400 UPLOAD_REJECTED)', async () => {
    for (const bad of [
      'https://evil.example/proof.png',
      `payment-proofs/${OTHER_USER}/${SUBMISSION}/123e4567-e89b-42d3-a456-426614174000.png`,
      `payment-proofs/${USER}/other-sub/123e4567-e89b-42d3-a456-426614174000.png`,
    ]) {
      await expect(mocks.service.confirmProof(USER, SUBMISSION, bad)).rejects.toMatchObject({
        code: 'UPLOAD_REJECTED',
        status: 400,
      });
    }
    expect(mocks.storage.head).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('rejects missing objects (upload-first) and oversized content', async () => {
    mocks.storage.head.mockResolvedValueOnce({ exists: false, sizeBytes: null, mimeType: null });
    await expect(mocks.service.confirmProof(USER, SUBMISSION, KEY)).rejects.toMatchObject({
      code: 'UPLOAD_REJECTED',
    });

    mocks.storage.head.mockResolvedValueOnce({ exists: true, sizeBytes: 99 * 1024 * 1024, mimeType: 'image/png' });
    await expect(mocks.service.confirmProof(USER, SUBMISSION, KEY)).rejects.toMatchObject({
      code: 'UPLOAD_REJECTED',
    });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('rejects non-image magic bytes and MIME mismatches', async () => {
    mocks.storage.readPrefix.mockResolvedValueOnce(PDF_PREFIX);
    await expect(mocks.service.confirmProof(USER, SUBMISSION, KEY)).rejects.toMatchObject({
      code: 'UPLOAD_REJECTED',
    });

    // Stored Content-Type says PNG but bytes are JPEG.
    mocks.storage.readPrefix.mockResolvedValueOnce(JPEG_PREFIX);
    await expect(mocks.service.confirmProof(USER, SUBMISSION, KEY)).rejects.toMatchObject({
      code: 'UPLOAD_REJECTED',
    });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it('returns 409 when the submission was reviewed concurrently (stale bind)', async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(mocks.service.confirmProof(USER, SUBMISSION, KEY)).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });
  });

  it('returns 404 for foreign-owned submissions without leaking existence', async () => {
    mocks.findFirst.mockResolvedValue(pendingSubmission(OTHER_USER));
    await expect(mocks.service.confirmProof(USER, SUBMISSION, KEY)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    expect(mocks.storage.head).not.toHaveBeenCalled();
  });
});

describe('adminProofUrl', () => {
  let mocks: Mocks;

  beforeEach(() => {
    mocks = createService();
  });

  it('issues a short-lived GET for the bound proof (audited)', async () => {
    mocks.findFirst.mockResolvedValue({ id: SUBMISSION, proofStorageKey: KEY });
    const result = await mocks.service.adminProofUrl('admin-1', SUBMISSION);

    expect(mocks.storage.presignGet).toHaveBeenCalledWith(KEY);
    expect(result).toMatchObject({ submissionId: SUBMISSION, storageKey: KEY });
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin.payment.proof_view', actorAdminId: 'admin-1' }),
    );
  });

  it('returns 404 for unknown submissions and submissions without proof', async () => {
    mocks.findFirst.mockResolvedValue(null);
    await expect(mocks.service.adminProofUrl('admin-1', SUBMISSION)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });

    mocks.findFirst.mockResolvedValue({ id: SUBMISSION, proofStorageKey: null });
    await expect(mocks.service.adminProofUrl('admin-1', SUBMISSION)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    expect(mocks.storage.presignGet).not.toHaveBeenCalled();
  });
});
