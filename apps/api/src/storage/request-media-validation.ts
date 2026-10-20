/**
 * Pure request-media validation helpers (Track B2). No I/O, no framework
 * dependencies — fully unit-testable.
 *
 * Policy (mirrors the proof policy in `proof-validation.ts`):
 * - MIME allowlist: image/jpeg | image/png | image/webp only.
 * - Max size comes from REQUEST_MEDIA_MAX_BYTES (default 5MB).
 * - Magic-byte sniffing on confirm (stored Content-Type is NOT trusted
 *   on its own) — shared with the proof helpers.
 * - Storage keys are server-generated under
 *   `request-media/{userId}/{requestId}/{uuid}.{ext}`. Client-supplied
 *   keys that do not match the caller's own prefix are rejected
 *   (anti URL-injection).
 */

import { detectMimeFromMagicBytes, type ProofMimeType } from './proof-validation';

export const REQUEST_MEDIA_KEY_PREFIX = 'request-media/';

export const REQUEST_MEDIA_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type RequestMediaMimeType = (typeof REQUEST_MEDIA_ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXTENSION: Record<RequestMediaMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REQUEST_MEDIA_KEY_PATTERN =
  /^request-media\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;

export function isAllowedRequestMediaMime(mime: string): mime is RequestMediaMimeType {
  return (REQUEST_MEDIA_ALLOWED_MIME_TYPES as readonly string[]).includes(mime.toLowerCase());
}

export function extensionForMediaMime(mime: RequestMediaMimeType): string {
  return MIME_TO_EXTENSION[mime];
}

export function isValidMediaUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Server-generated storage key. `uuid` MUST be a fresh random UUID per
 * upload grant (prevents key guessing + overwrites).
 */
export function buildRequestMediaStorageKey(
  userId: string,
  requestId: string,
  mimeType: RequestMediaMimeType,
  uuid: string,
): string {
  if (!isValidMediaUuid(uuid)) {
    throw new Error('buildRequestMediaStorageKey requires a valid UUID');
  }
  return `${REQUEST_MEDIA_KEY_PREFIX}${userId}/${requestId}/${uuid}.${extensionForMediaMime(mimeType)}`;
}

/** Expected key prefix binding a key to one (uploader, request) pair. */
export function expectedMediaKeyPrefixFor(userId: string, requestId: string): string {
  return `${REQUEST_MEDIA_KEY_PREFIX}${userId}/${requestId}/`;
}

/**
 * Ownership/prefix check for a CLIENT-SUPPLIED key on confirm. Rejects:
 * - anything not under the caller's own request prefix (kills arbitrary
 *   URL / foreign-key injection),
 * - absolute URLs, schemes, backslashes, `..` traversal segments,
 * - keys that do not match the generated shape (uuid + allowlisted ext).
 */
export function isMediaKeyOwnedBy(key: string, userId: string, requestId: string): boolean {
  if (key.length === 0 || key.length > 512) {
    return false;
  }
  if (key.includes('://') || key.includes('\\') || key.split('/').includes('..')) {
    return false;
  }
  if (!key.startsWith(expectedMediaKeyPrefixFor(userId, requestId))) {
    return false;
  }
  return REQUEST_MEDIA_KEY_PATTERN.test(key);
}

export function isRequestMediaSizeAccepted(sizeBytes: number, maxBytes: number): boolean {
  return Number.isInteger(sizeBytes) && sizeBytes > 0 && sizeBytes <= maxBytes;
}

export { detectMimeFromMagicBytes };
export type { ProofMimeType as SniffedMimeType };
