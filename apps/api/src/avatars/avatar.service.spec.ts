/**
 * Unit tests for the avatar lifecycle service (WP-01).
 *
 * Storage, Prisma, audit, and rate limiting are stubbed (no
 * credentials, no network, no database): ownership scoping,
 * compensation on DB failure, idempotent delete, foreign-URL safety,
 * rate limiting, and size gates are verified here. Byte-level image
 * rules (magic + sharp decode) run for real — `sharp` is a direct
 * dependency, verified compatible at implementation time.
 */

import 'reflect-metadata';

import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AvatarService, type AvatarOwnerKind } from './avatar.service';

import type { AvatarStoragePort } from '../storage/avatar-storage.port';

const USER = '11111111-1111-4111-8111-111111111111';
const BASE = 'http://localhost:3000/api/v1/avatars-file';
const UUID = '123e4567-e89b-42d3-a456-426614174000';
const OWNED_KEY = `avatars/${USER}/${UUID}.png`;
const OWNED_URL = `${BASE}/${OWNED_KEY}`;
const FOREIGN_URL = 'https://cdn.example.com/legacy/photo.png';

async function makePngBytes(width = 32, height = 32): Promise<Uint8Array> {
  const buf = await sharp({
    create: { width, height, channels: 3, background: { r: 9, g: 9, b: 9 } },
  })
    .png()
    .toBuffer();
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

interface Mocks {
  service: AvatarService;
  prisma: {
    customerProfile: { findFirst: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
    technicianProfile: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    merchantProfile: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  auditLog: ReturnType<typeof vi.fn>;
  rateCheck: ReturnType<typeof vi.fn>;
  storage: {
    putBuffer: ReturnType<typeof vi.fn>;
    getPublicUrl: ReturnType<typeof vi.fn>;
    head: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

function createService(): Mocks {
  const prisma = {
    customerProfile: {
      findFirst: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
    },
    technicianProfile: {
      findFirst: vi.fn(async () => ({ id: 'profile-1' })),
      create: vi.fn(async () => ({ id: 'profile-1' })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    merchantProfile: {
      findFirst: vi.fn(async () => ({ id: 'merchant-1' })),
      create: vi.fn(async () => ({ id: 'merchant-1' })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  };
  const auditLog = vi.fn(async () => undefined);
  const rateCheck = vi.fn(async () => ({
    allowed: true,
    remaining: 9,
    resetAt: new Date(),
    limit: 10,
    ttlSeconds: 900,
  }));
  const storage = {
    provider: 'local' as const,
    putBuffer: vi.fn(async () => undefined),
    getPublicUrl: vi.fn((key: string) => `${BASE}/${key}`),
    head: vi.fn(async () => ({ exists: true, sizeBytes: 1024, mimeType: 'image/png' })),
    delete: vi.fn(async () => undefined),
  };
  const service = new AvatarService(
    prisma as never,
    { log: auditLog } as never,
    { checkLimit: rateCheck } as never,
    storage as unknown as AvatarStoragePort,
  );
  return { service, prisma, auditLog, rateCheck, storage };
}

describe('uploadAvatar', () => {
  let mocks: Mocks;

  beforeEach(() => {
    mocks = createService();
  });

  it('stores bytes under a server-generated key and binds the public URL (customer)', async () => {
    const bytes = await makePngBytes();
    const result = await mocks.service.uploadAvatar({
      userId: USER,
      kind: 'customer',
      bytes,
      sizeBytes: bytes.byteLength,
    });

    expect(mocks.storage.putBuffer).toHaveBeenCalledOnce();
    const [key, stored, mime] = mocks.storage.putBuffer.mock.calls[0] as [
      string,
      Uint8Array,
      string,
    ];
    expect(key.startsWith(`avatars/${USER}/`)).toBe(true);
    expect(key.endsWith('.png')).toBe(true);
    expect(stored.byteLength).toBeGreaterThan(0);
    expect(mime).toBe('image/png');
    expect(result.publicUrl).toBe(`${BASE}/${key}`);
    expect(mocks.prisma.customerProfile.upsert).toHaveBeenCalledOnce();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'customer.avatar.upload', entityId: USER }),
    );
  });

  it('deletes the previous OWNED object after a successful replacement', async () => {
    mocks.prisma.customerProfile.findFirst.mockResolvedValueOnce({ avatarUrl: OWNED_URL });
    const bytes = await makePngBytes();
    await mocks.service.uploadAvatar({ userId: USER, kind: 'customer', bytes, sizeBytes: 100 });

    expect(mocks.storage.delete).toHaveBeenCalledOnce();
    expect(mocks.storage.delete.mock.calls[0]?.[0]).toBe(OWNED_KEY);
  });

  it('never deletes a previous FOREIGN (legacy) URL', async () => {
    mocks.prisma.customerProfile.findFirst.mockResolvedValueOnce({ avatarUrl: FOREIGN_URL });
    const bytes = await makePngBytes();
    await mocks.service.uploadAvatar({ userId: USER, kind: 'customer', bytes, sizeBytes: 100 });

    expect(mocks.storage.delete).not.toHaveBeenCalled();
  });

  it('compensates the new object when the DB update fails', async () => {
    mocks.prisma.customerProfile.upsert.mockRejectedValueOnce(new Error('db down'));
    const bytes = await makePngBytes();

    await expect(
      mocks.service.uploadAvatar({ userId: USER, kind: 'customer', bytes, sizeBytes: 100 }),
    ).rejects.toThrow('db down');
    expect(mocks.storage.delete).toHaveBeenCalledOnce();
  });

  it('rejects oversize uploads with 413 before touching storage', async () => {
    const bytes = await makePngBytes();
    await expect(
      mocks.service.uploadAvatar({
        userId: USER,
        kind: 'customer',
        bytes,
        sizeBytes: 2 * 1024 * 1024 + 1,
      }),
    ).rejects.toMatchObject({ status: 413, code: 'UPLOAD_REJECTED' });
    expect(mocks.storage.putBuffer).not.toHaveBeenCalled();
  });

  it('rejects non-image bytes with 400 (declared type never trusted)', async () => {
    const fake = new TextEncoder().encode('NOT AN IMAGE AT ALL ...................');
    await expect(
      mocks.service.uploadAvatar({ userId: USER, kind: 'customer', bytes: fake, sizeBytes: 40 }),
    ).rejects.toMatchObject({ status: 400, code: 'UPLOAD_REJECTED' });
    expect(mocks.storage.putBuffer).not.toHaveBeenCalled();
  });

  it('enforces the shared-store avatar rate policy (429, no side effects)', async () => {
    mocks.rateCheck.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetAt: new Date(),
      limit: 10,
      ttlSeconds: 900,
    });
    const bytes = await makePngBytes();
    await expect(
      mocks.service.uploadAvatar({ userId: USER, kind: 'customer', bytes, sizeBytes: 100 }),
    ).rejects.toMatchObject({ status: 429 });
    expect(mocks.rateCheck).toHaveBeenCalledWith('avatar', `avatar:${USER}`);
    expect(mocks.storage.putBuffer).not.toHaveBeenCalled();
  });

  it.each([
    ['technician' as AvatarOwnerKind, 'technicianProfile'],
    ['merchant' as AvatarOwnerKind, 'merchantProfile'],
  ])('binds the %s profile row (owner-scoped)', async (kind, table) => {
    const bytes = await makePngBytes();
    const result = await mocks.service.uploadAvatar({ userId: USER, kind, bytes, sizeBytes: 100 });
    expect(result.publicUrl.startsWith(BASE)).toBe(true);
    const stub = mocks.prisma[table as 'technicianProfile' | 'merchantProfile'];
    expect(stub.updateMany).toHaveBeenCalledOnce();
    const where = (stub.updateMany.mock.calls[0]?.[0] as { where: Record<string, string> }).where;
    expect(where['userId']).toBe(USER);
  });
});

describe('deleteAvatar', () => {
  let mocks: Mocks;

  beforeEach(() => {
    mocks = createService();
  });

  it('is idempotent: absence returns deleted=false with no side effects', async () => {
    const result = await mocks.service.deleteAvatar(USER, 'customer');
    expect(result).toEqual({ deleted: false });
    expect(mocks.storage.delete).not.toHaveBeenCalled();
    expect(mocks.prisma.customerProfile.upsert).not.toHaveBeenCalled();
  });

  it('NULLs the reference and deletes the owned object', async () => {
    mocks.prisma.customerProfile.findFirst.mockResolvedValueOnce({ avatarUrl: OWNED_URL });
    const result = await mocks.service.deleteAvatar(USER, 'customer');
    expect(result).toEqual({ deleted: true });
    expect(mocks.prisma.customerProfile.upsert).toHaveBeenCalledOnce();
    expect(mocks.storage.delete).toHaveBeenCalledWith(OWNED_KEY);
  });

  it('NULLs foreign legacy URLs without attempting a delete', async () => {
    mocks.prisma.customerProfile.findFirst.mockResolvedValueOnce({ avatarUrl: FOREIGN_URL });
    const result = await mocks.service.deleteAvatar(USER, 'customer');
    expect(result).toEqual({ deleted: true });
    expect(mocks.storage.delete).not.toHaveBeenCalled();
  });

  it('still reports success when the object delete fails (orphan recorded)', async () => {
    mocks.prisma.customerProfile.findFirst.mockResolvedValueOnce({ avatarUrl: OWNED_URL });
    mocks.storage.delete.mockRejectedValueOnce(new Error('s3 down'));
    const result = await mocks.service.deleteAvatar(USER, 'customer');
    expect(result).toEqual({ deleted: true });
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'customer.avatar.orphan_delete_failed' }),
    );
  });
});

describe('resolveOwnedKey', () => {
  it('resolves owned keys and refuses foreign values', async () => {
    const { service } = createService();
    expect(await service.resolveOwnedKey(USER, OWNED_URL)).toBe(OWNED_KEY);
    expect(await service.resolveOwnedKey(USER, FOREIGN_URL)).toBeNull();
    expect(await service.resolveOwnedKey(USER, null)).toBeNull();
  });
});
