import { describe, expect, it, vi } from 'vitest';

import { uploadRequestPhotos } from './upload-request-photos';

import type { RequestAttachment } from './service-request-types';
import type { RequestPhotoUploader } from './upload-request-photos';

const PHOTO_A: RequestAttachment = {
  id: 'a',
  uri: 'file:///tmp/a.jpg',
  fileName: 'a.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 100,
};

const PHOTO_B: RequestAttachment = {
  id: 'b',
  uri: 'file:///tmp/b.png',
  fileName: 'b.png',
  mimeType: 'image/png',
  sizeBytes: 200,
};

function makeUploader(overrides?: {
  put?: (photoId: string) => Promise<void> | void;
  confirm?: (photoId: string) => Promise<void> | void;
}): { uploader: RequestPhotoUploader; calls: string[] } {
  const calls: string[] = [];
  const uploader: RequestPhotoUploader = {
    requestPhotoUploadUrl: vi.fn(async (input) => {
      calls.push(`grant:${input.mimeType}`);
      return {
        storageKey: `request-media/user/${input.requestId}/${input.mimeType}.bin`,
        uploadUrl: `memory://${input.requestId}`,
        requiredHeaders: {},
        mimeType: input.mimeType,
        maxBytes: 5 * 1024 * 1024,
        expiresInSeconds: 300,
      };
    }),
    putPhotoBytes: vi.fn(async (input) => {
      calls.push(`put:${input.photo.id}`);
      await overrides?.put?.(input.photo.id);
    }),
    confirmPhoto: vi.fn(async (input) => {
      calls.push(`confirm:${input.storageKey}`);
      await overrides?.confirm?.(input.storageKey);
    }),
  };
  return { uploader, calls };
}

describe('uploadRequestPhotos (Track B2)', () => {
  it('runs grant → PUT → confirm per photo, sequentially, and reports progress', async () => {
    const { uploader, calls } = makeUploader();
    const progress: Array<{ done: number; total: number }> = [];

    const outcome = await uploadRequestPhotos({
      requestId: 'req-1',
      photos: [PHOTO_A, PHOTO_B],
      uploader,
      onProgress: (p) => progress.push(p),
    });

    expect(outcome.failed).toHaveLength(0);
    expect(outcome.done).toBe(2);
    expect(calls).toEqual([
      'grant:image/jpeg',
      'put:a',
      'confirm:request-media/user/req-1/image/jpeg.bin',
      'grant:image/png',
      'put:b',
      'confirm:request-media/user/req-1/image/png.bin',
    ]);
    expect(progress).toEqual([
      { done: 0, total: 2 },
      { done: 1, total: 2 },
      { done: 2, total: 2 },
    ]);
  });

  it('collects only the failing photos and never calls confirm after a failed PUT', async () => {
    const { uploader, calls } = makeUploader({
      put: (photoId) => {
        if (photoId === 'a') throw new Error('network');
      },
    });

    const outcome = await uploadRequestPhotos({
      requestId: 'req-1',
      photos: [PHOTO_A, PHOTO_B],
      uploader,
    });

    expect(outcome.failed.map((p) => p.id)).toEqual(['a']);
    expect(outcome.done).toBe(1);
    expect(calls).toEqual([
      'grant:image/jpeg',
      'put:a',
      'grant:image/png',
      'put:b',
      'confirm:request-media/user/req-1/image/png.bin',
    ]);
  });

  it('retries exactly the failed photos, preserving the created request id', async () => {
    let failFirstPass = true;
    const { uploader, calls } = makeUploader({
      confirm: (storageKey) => {
        if (storageKey.includes('image/jpeg') && failFirstPass) {
          failFirstPass = false;
          throw new Error('rejected');
        }
      },
    });

    const first = await uploadRequestPhotos({
      requestId: 'req-9',
      photos: [PHOTO_A, PHOTO_B],
      uploader,
    });
    expect(first.failed.map((p) => p.id)).toEqual(['a']);

    const retry = await uploadRequestPhotos({
      requestId: 'req-9',
      photos: first.failed,
      uploader,
    });
    expect(retry.failed).toHaveLength(0);
    expect(retry.done).toBe(1);
    expect(calls.filter((c) => c === 'confirm:request-media/user/req-9/image/jpeg.bin')).toHaveLength(2);
    expect(calls.filter((c) => c.startsWith('grant:')).length).toBe(3);
  });
});
