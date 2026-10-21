/**
 * Unit tests for the avatar image pipeline (WP-01, D4).
 *
 * Uses REAL `sharp` (verified compatible at implementation time):
 * decode, dimension cap, re-encode, and EXIF stripping are exercised
 * against generated images — no fixtures, no network.
 */

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { AVATAR_MAX_DIMENSION_PX, validateAndProcessAvatarImage } from './avatar-image';

async function makePng(width: number, height: number): Promise<Uint8Array> {
  const buf = await sharp({
    create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

describe('validateAndProcessAvatarImage', () => {
  it('accepts a real PNG and returns canonical bytes + dimensions', async () => {
    const raw = await makePng(64, 48);
    const out = await validateAndProcessAvatarImage(raw);
    expect(out.mimeType).toBe('image/png');
    expect(out.width).toBe(64);
    expect(out.height).toBe(48);
    expect(out.bytes.byteLength).toBeGreaterThan(0);
  });

  it('downscales images larger than the dimension cap', async () => {
    const raw = await makePng(AVATAR_MAX_DIMENSION_PX * 2, AVATAR_MAX_DIMENSION_PX);
    const out = await validateAndProcessAvatarImage(raw);
    expect(Math.max(out.width, out.height)).toBeLessThanOrEqual(AVATAR_MAX_DIMENSION_PX);
  });

  it('rejects non-image bytes (fake MIME content)', async () => {
    const fake = new TextEncoder().encode('%PDF-1.4 fake image content ............');
    await expect(validateAndProcessAvatarImage(fake)).rejects.toMatchObject({
      status: 400,
      code: 'UPLOAD_REJECTED',
    });
  });

  it('rejects truncated/corrupt image bytes', async () => {
    const raw = await makePng(32, 32);
    const truncated = raw.subarray(0, 16);
    await expect(validateAndProcessAvatarImage(truncated)).rejects.toMatchObject({
      status: 400,
      code: 'UPLOAD_REJECTED',
    });
  });

  it('strips metadata on re-encode (no EXIF passthrough)', async () => {
    const withExif = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: 'SOMEONE' } } as never })
      .toBuffer();
    const out = await validateAndProcessAvatarImage(
      new Uint8Array(withExif.buffer, withExif.byteOffset, withExif.byteLength),
    );
    expect(out.mimeType).toBe('image/jpeg');
    const meta = await sharp(Buffer.from(out.bytes)).metadata();
    expect(meta.exif).toBeUndefined();
  });
});
