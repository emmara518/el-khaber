/**
 * Pure avatar validation helpers (WP-01). No I/O, no framework
 * dependencies — fully unit-testable.
 *
 * Policy:
 * - MIME allowlist: image/jpeg | image/png | image/webp only.
 * - Max size from AVATAR_MAX_BYTES (default 2MB).
 * - Magic-byte sniffing on the uploaded bytes (the client-declared MIME
 *   and the original filename are NEVER trusted).
 * - Storage keys are server-generated under
 *   `avatars/{userId}/{uuid}.{ext}`. Any client-supplied key/URL that
 *   does not match the caller's own prefix is rejected, and legacy
 *   external URLs are never deleted (they are not ours).
 */

export const AVATAR_KEY_PREFIX = 'avatars/';

export const AVATAR_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AvatarMimeType = (typeof AVATAR_ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXTENSION: Record<AvatarMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AVATAR_KEY_PATTERN = /^avatars\/[A-Za-z0-9_-]+\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;

export function isAllowedAvatarMime(mime: string): mime is AvatarMimeType {
  return (AVATAR_ALLOWED_MIME_TYPES as readonly string[]).includes(mime.toLowerCase());
}

export function extensionForAvatarMime(mime: AvatarMimeType): string {
  return MIME_TO_EXTENSION[mime];
}

export function isValidAvatarUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Server-generated storage key. `uuid` MUST be a fresh random UUID per
 * upload (prevents key guessing + overwrites of other users' objects).
 */
export function buildAvatarStorageKey(
  userId: string,
  mimeType: AvatarMimeType,
  uuid: string,
): string {
  if (!isValidAvatarUuid(uuid)) {
    throw new Error('buildAvatarStorageKey requires a valid UUID');
  }
  return `${AVATAR_KEY_PREFIX}${userId}/${uuid}.${extensionForAvatarMime(mimeType)}`;
}

/** Expected key prefix binding a key to one owner. */
export function expectedAvatarKeyPrefixFor(userId: string): string {
  return `${AVATAR_KEY_PREFIX}${userId}/`;
}

/**
 * Ownership check for a STORED key before delete. Returns true only for
 * keys the avatar service itself generated for this user:
 * - correct owner prefix + generated shape (uuid + allowlisted ext),
 * - no schemes, backslashes, or `..` traversal segments.
 *
 * Legacy external URLs (http(s)://, data:, pasted links) return false —
 * the service MUST NOT attempt to delete objects it does not own.
 */
export function isAvatarKeyOwnedBy(key: string, userId: string): boolean {
  if (key.length === 0 || key.length > 512) {
    return false;
  }
  if (key.includes('://') || key.includes('\\') || key.split('/').includes('..')) {
    return false;
  }
  if (!key.startsWith(expectedAvatarKeyPrefixFor(userId))) {
    return false;
  }
  return AVATAR_KEY_PATTERN.test(key);
}

/**
 * Extracts the storage key from a public avatar URL previously issued by
 * this service (`{publicBase}/{key}`). Returns null for foreign URLs
 * (legacy pasted links, external hosts) — those are read-only history
 * and must never be resolved into delete targets.
 */
export function avatarKeyFromPublicUrl(publicUrl: string, publicBaseUrl: string): string | null {
  const base = publicBaseUrl.endsWith('/') ? publicBaseUrl : `${publicBaseUrl}/`;
  if (!publicUrl.startsWith(base)) {
    return null;
  }
  const key = publicUrl.slice(base.length);
  if (key.length === 0 || key.length > 512) {
    return null;
  }
  if (key.includes('://') || key.includes('\\') || key.split('/').includes('..')) {
    return null;
  }
  return AVATAR_KEY_PATTERN.test(key) ? key : null;
}

export function isAvatarSizeAccepted(sizeBytes: number, maxBytes: number): boolean {
  return Number.isInteger(sizeBytes) && sizeBytes > 0 && sizeBytes <= maxBytes;
}

/**
 * Magic-byte sniffing for the allowlisted image types. Inspects at most
 * the first 12 bytes:
 * - JPEG: FF D8 FF
 * - PNG:  89 50 4E 47 0D 0A 1A 0A
 * - WebP: "RIFF"...."WEBP" (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
 * Returns null when the bytes match none of the allowlisted types.
 */
export function detectAvatarMimeFromMagicBytes(bytes: Uint8Array): AvatarMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return 'image/webp';
  }
  return null;
}
