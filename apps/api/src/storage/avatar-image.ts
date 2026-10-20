/**
 * Avatar image pipeline (WP-01, D4).
 *
 * Validates uploaded bytes as a REAL decodable image and re-encodes
 * them into a canonical, metadata-stripped form:
 * - magic-byte sniff first (the client-declared MIME and the original
 *   filename are NEVER trusted),
 * - `sharp` decode proves the file is a genuine image (corrupt/fake
 *   files are rejected, not stored),
 * - dimensions are capped (default 2048px on the longest side; larger
 *   images are downscaled, absurd images rejected),
 * - re-encode drops EXIF and all ancillary metadata (sharp strips
 *   metadata unless `withMetadata()` is called — it never is here).
 *
 * `sharp` compatibility was verified on the project's runtimes before
 * this pipeline was introduced (import + decode + resize + re-encode
 * exercised; Docker uses the same Debian bookworm userland).
 */

import { ERROR_CODE } from '@khabir/shared-types';
import sharp from 'sharp';

import { ApiException } from '../common/errors';

import { detectAvatarMimeFromMagicBytes, type AvatarMimeType } from './avatar-validation';

/** Longest side allowed; larger images are downscaled to fit. */
export const AVATAR_MAX_DIMENSION_PX = 2048;

export interface ProcessedAvatarImage {
  /** Canonical re-encoded bytes (metadata stripped). */
  bytes: Uint8Array;
  /** MIME derived from the actual bytes (never from the client). */
  mimeType: AvatarMimeType;
  width: number;
  height: number;
}

function uploadRejected(message: string): ApiException {
  return new ApiException(ERROR_CODE.UPLOAD_REJECTED, message, 400);
}

/**
 * Validates + normalizes raw upload bytes. Throws UPLOAD_REJECTED (400)
 * for non-images, corrupt files, and unreasonable dimensions.
 */
export async function validateAndProcessAvatarImage(
  raw: Uint8Array,
): Promise<ProcessedAvatarImage> {
  const sniffed = detectAvatarMimeFromMagicBytes(raw);
  if (sniffed === null) {
    throw uploadRejected('File is not a supported image (JPEG, PNG, or WebP required).');
  }

  const input = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
  let pipeline: sharp.Sharp;
  try {
    pipeline = sharp(input, { failOn: 'none' });
    // Force a full decode now so corrupt files fail HERE, not at store.
    const metadata = await pipeline.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw uploadRejected('Image has no readable dimensions.');
    }
    if (width > 16 * 1024 || height > 16 * 1024) {
      throw uploadRejected('Image dimensions are unreasonably large.');
    }

    const resized =
      Math.max(width, height) > AVATAR_MAX_DIMENSION_PX
        ? pipeline.resize(AVATAR_MAX_DIMENSION_PX, AVATAR_MAX_DIMENSION_PX, {
            fit: 'inside',
            withoutEnlargement: true,
          })
        : pipeline;

    let out: Buffer;
    if (sniffed === 'image/jpeg') {
      out = await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    } else if (sniffed === 'image/png') {
      out = await resized.png({ compressionLevel: 9 }).toBuffer();
    } else {
      out = await resized.webp({ quality: 82 }).toBuffer();
    }
    const outMeta = await sharp(out).metadata();
    return {
      bytes: new Uint8Array(out.buffer, out.byteOffset, out.byteLength),
      mimeType: sniffed,
      width: outMeta.width ?? width,
      height: outMeta.height ?? height,
    };
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }
    throw uploadRejected('File could not be decoded as an image.');
  }
}
