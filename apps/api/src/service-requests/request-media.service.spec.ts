/**
 * Unit tests for the service-request media lifecycle (Track B2).
 *
 * The StoragePort is fully mocked (no credentials, no network): ownership,
 * key-prefix, MIME/size, magic-byte, limit, and cleanup rules are verified
 * against a stub. Object-storage signing itself is covered by the adapter
 * fail-closed contract, not by live calls.
 */

import 'reflect-metadata';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestMediaService } from './request-media.service';

import type { StoragePort } from '../storage/storage.port';

const USER = '11111111-1111-4111-8111-111111111111';
const OTHER_USER = '22222222-2222-4222-8222-222222222222';
const REQUEST = '33333333-3333-4333-8333-333333333333';
const PROFILE = '44444444-4444-4444-8444-444444444444';
const MEDIA = '55555555-5555-4555-8555-555555555555';
const KEY = `request-media/${USER}/${REQUEST}/123e4567-e89b-42d3-a456-426614174000.png`;

const PNG_PREFIX = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_PREFIX = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const PDF_PREFIX = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0]);

interface Mocks {
  service: RequestMediaService;
  requestFindFirst: ReturnType<typeof vi.fn>;
  profileFindFirst: ReturnType<typeof vi.fn>;
  mediaCount: ReturnType<typeof vi.fn>;
  mediaCreate: ReturnType<typeof vi.fn>;
  mediaFindMany: ReturnType<typeof vi.fn>;
  mediaFindFirst: ReturnType<typeof vi.fn>;
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
  const requestFindFirst = vi.fn();
  const profileFindFirst = vi.fn();
  const mediaCount = vi.fn();
  const mediaCreate = vi.fn();
  const mediaFindMany = vi.fn();
  const mediaFindFirst = vi.fn();
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
  const prisma = {
    serviceRequest: { findFirst: requestFindFirst },
    technicianProfile: { findFirst: profileFindFirst },
    $queryRaw: vi.fn(async () => []),
    serviceRequestMedia: {
      count: mediaCount,
      create: mediaCreate,
      findMany: mediaFindMany,
      findFirst: mediaFindFirst,
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };
  const audit = { log: auditLog };
  const service = new RequestMediaService(
    prisma as never,
    audit as never,
    storage as unknown as StoragePort,
  );
  return {
    service,
    requestFindFirst,
    profileFindFirst,
    mediaCount,
    mediaCreate,
    mediaFindMany,
    mediaFindFirst,
    auditLog,
    storage,
  };
}

function ownedRequest(status: string = 'pending'): Record<string, unknown> {
  return { id: REQUEST, status };
}

describe('requestUploadUrl', () => {
  let mocks: Mocks;

  beforeEach(() => {
    mocks = createService();
    mocks.requestFindFirst.mockResolvedValue(ownedRequest());
    mocks.mediaCount.mockResolvedValue(0);
  });

  it('issues a presigned PUT for a server-generated key (owner, not cancelled)', async () => {
    const result = await mocks.service.requestUploadUrl(USER, REQUEST, 'image/png');

    expect(mocks.storage.presignPut).toHaveBeenCalledOnce();
    const [key, mime] = mocks.storage.presignPut.mock.calls[0] as [string, string];
    expect(mime).toBe('image/png');
    expect(key.startsWith(`request-media/${USER}/${REQUEST}/`)).toBe(true);
    expect(key.endsWith('.png')).toBe(true);
    expect(result).toMatchObject({ requestId: REQUEST, storageKey: key, mimeType: 'image/png' });
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.service_request.media_upload_url',
        entityId: REQUEST,
        actorUserId: USER,
      }),
    );
  });

  it('rejects non-allowlisted MIME types (400) without touching storage', async () => {
    await expect(
      mocks.service.requestUploadUrl(USER, REQUEST, 'application/pdf'),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
    expect(mocks.storage.presignPut).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown or foreign-owned requests', async () => {
    mocks.requestFindFirst.mockResolvedValue(null);
    await expect(
      mocks.service.requestUploadUrl(USER, REQUEST, 'image/png'),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(mocks.storage.presignPut).not.toHaveBeenCalled();
  });

  it('returns 409 for cancelled requests', async () => {
    mocks.requestFindFirst.mockResolvedValue(ownedRequest('cancelled'));
    await expect(
      mocks.service.requestUploadUrl(USER, REQUEST, 'image/png'),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
    expect(mocks.storage.presignPut).not.toHaveBeenCalled();
  });

  it('returns 409 when the per-request limit is already reached', async () => {
    mocks.mediaCount.mockResolvedValue(5);
    await expect(
      mocks.service.requestUploadUrl(USER, REQUEST, 'image/png'),
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 });
    expect(mocks.storage.presignPut).not.toHaveBeenCalled();
  });
});

describe('confirmMedia', () => {
  let mocks: Mocks;

  beforeEach(() => {
    mocks = createService();
    mocks.requestFindFirst.mockResolvedValue(ownedRequest());
    mocks.mediaCount.mockResolvedValue(0);
    mocks.mediaCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: MEDIA,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      createdAt: new Date('2026-10-20T10:00:00.000Z'),
    }));
  });

  it('HEAD-validates, sniffs magic bytes, creates the row, and audits', async () => {
    const result = await mocks.service.confirmMedia(USER, REQUEST, KEY);

    expect(mocks.storage.head).toHaveBeenCalledWith(KEY);
    expect(mocks.storage.readPrefix).toHaveBeenCalledWith(KEY, 12);
    expect(mocks.mediaCreate).toHaveBeenCalledWith({
      data: {
        serviceRequestId: REQUEST,
        uploadedByUserId: USER,
        storageKey: KEY,
        mimeType: 'image/png',
        fileSize: 1024,
      },
    });
    expect(result).toMatchObject({ id: MEDIA, mimeType: 'image/png', fileSize: 1024 });
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.service_request.media_confirm',
        entityId: REQUEST,
      }),
      expect.anything(),
    );
    expect(mocks.storage.delete).not.toHaveBeenCalled();
  });

  it('rejects arbitrary URL injection and foreign keys (400) before touching storage', async () => {
    for (const bad of [
      'https://evil.example/photo.png',
      `request-media/${OTHER_USER}/${REQUEST}/123e4567-e89b-42d3-a456-426614174000.png`,
      `request-media/${USER}/other-request/123e4567-e89b-42d3-a456-426614174000.png`,
      `request-media/${USER}/${REQUEST}/../../etc/passwd.png`,
    ]) {
      await expect(mocks.service.confirmMedia(USER, REQUEST, bad)).rejects.toMatchObject({
        code: 'UPLOAD_REJECTED',
        status: 400,
      });
    }
    expect(mocks.storage.head).not.toHaveBeenCalled();
    expect(mocks.mediaCreate).not.toHaveBeenCalled();
  });

  it('rejects a missing object without cleanup (nothing exists yet)', async () => {
    mocks.storage.head.mockResolvedValueOnce({ exists: false, sizeBytes: null, mimeType: null });
    await expect(mocks.service.confirmMedia(USER, REQUEST, KEY)).rejects.toMatchObject({
      code: 'UPLOAD_REJECTED',
      status: 400,
    });
    expect(mocks.storage.delete).not.toHaveBeenCalled();
  });

  it('rejects oversized content and cleans up the orphan object', async () => {
    mocks.storage.head.mockResolvedValueOnce({
      exists: true,
      sizeBytes: 99 * 1024 * 1024,
      mimeType: 'image/png',
    });
    await expect(mocks.service.confirmMedia(USER, REQUEST, KEY)).rejects.toMatchObject({
      code: 'UPLOAD_REJECTED',
    });
    expect(mocks.storage.delete).toHaveBeenCalledWith(KEY);
    expect(mocks.mediaCreate).not.toHaveBeenCalled();
  });

  it('rejects non-image magic bytes and MIME mismatches, cleaning up each time', async () => {
    mocks.storage.readPrefix.mockResolvedValueOnce(PDF_PREFIX);
    await expect(mocks.service.confirmMedia(USER, REQUEST, KEY)).rejects.toMatchObject({
      code: 'UPLOAD_REJECTED',
    });

    // Stored Content-Type says PNG but bytes are JPEG.
    mocks.storage.readPrefix.mockResolvedValueOnce(JPEG_PREFIX);
    await expect(mocks.service.confirmMedia(USER, REQUEST, KEY)).rejects.toMatchObject({
      code: 'UPLOAD_REJECTED',
    });

    expect(mocks.storage.delete).toHaveBeenCalledTimes(2);
    expect(mocks.mediaCreate).not.toHaveBeenCalled();
  });

  it('enforces the limit inside the transaction (409) and cleans up the extra object', async () => {
    mocks.mediaCount.mockResolvedValue(5);
    await expect(mocks.service.confirmMedia(USER, REQUEST, KEY)).rejects.toMatchObject({
      code: 'CONFLICT',
      status: 409,
    });
    expect(mocks.mediaCreate).not.toHaveBeenCalled();
    expect(mocks.storage.delete).toHaveBeenCalledWith(KEY);
  });

  it('returns 404 for foreign-owned requests without touching storage', async () => {
    mocks.requestFindFirst.mockResolvedValue(null);
    await expect(mocks.service.confirmMedia(USER, REQUEST, KEY)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    expect(mocks.storage.head).not.toHaveBeenCalled();
  });
});

describe('listMedia', () => {
  let mocks: Mocks;

  beforeEach(() => {
    mocks = createService();
    mocks.requestFindFirst.mockResolvedValue({ id: REQUEST });
    mocks.profileFindFirst.mockResolvedValue({ id: PROFILE });
    mocks.mediaFindMany.mockResolvedValue([
      {
        id: MEDIA,
        mimeType: 'image/png',
        fileSize: 1024,
        createdAt: new Date('2026-10-20T10:00:00.000Z'),
      },
    ]);
  });

  it('returns metadata without storage keys to the owner', async () => {
    const items = await mocks.service.listMedia(USER, 'customer', REQUEST);

    expect(items).toEqual([
      { id: MEDIA, mimeType: 'image/png', fileSize: 1024, createdAt: '2026-10-20T10:00:00.000Z' },
    ]);
    expect(JSON.stringify(items)).not.toContain('request-media/');
    expect(mocks.mediaFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { serviceRequestId: REQUEST },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('allows the targeted/assigned technician and 404s technicians without a profile', async () => {
    await expect(mocks.service.listMedia('tech-user', 'technician', REQUEST)).resolves.toHaveLength(1);

    mocks.profileFindFirst.mockResolvedValue(null);
    await expect(
      mocks.service.listMedia('tech-user', 'technician', REQUEST),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('returns 404 to strangers and merchants', async () => {
    mocks.requestFindFirst.mockResolvedValue(null);
    await expect(mocks.service.listMedia(OTHER_USER, 'customer', REQUEST)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });

    await expect(mocks.service.listMedia('merchant-user', 'merchant', REQUEST)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });
});

describe('mediaUrl', () => {
  let mocks: Mocks;

  beforeEach(() => {
    mocks = createService();
    mocks.requestFindFirst.mockResolvedValue({ id: REQUEST });
    mocks.mediaFindFirst.mockResolvedValue({ id: MEDIA, storageKey: KEY });
  });

  it('issues a short-lived presigned GET for participants (audited)', async () => {
    const result = await mocks.service.mediaUrl(USER, 'customer', REQUEST, MEDIA);

    expect(mocks.storage.presignGet).toHaveBeenCalledWith(KEY);
    expect(result).toMatchObject({ mediaId: MEDIA, downloadUrl: `local://${KEY}` });
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user.service_request.media_view',
        entityId: REQUEST,
        actorUserId: USER,
      }),
    );
  });

  it('returns 404 for unknown photos without signing anything', async () => {
    mocks.mediaFindFirst.mockResolvedValue(null);
    await expect(mocks.service.mediaUrl(USER, 'customer', REQUEST, MEDIA)).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
    expect(mocks.storage.presignGet).not.toHaveBeenCalled();
  });

  it('returns 404 for non-participants', async () => {
    mocks.requestFindFirst.mockResolvedValue(null);
    await expect(
      mocks.service.mediaUrl(OTHER_USER, 'customer', REQUEST, MEDIA),
    ).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
    expect(mocks.storage.presignGet).not.toHaveBeenCalled();
  });
});
