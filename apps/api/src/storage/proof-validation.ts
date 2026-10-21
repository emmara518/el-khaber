/**
 * Pure proof validation helpers (PHASE 20). No I/O, no framework
 * dependencies — fully unit-testable.
 *
 * Policy:
 * - MIME allowlist: image/jpeg | image/png | image/webp only.
 * - Max size from PROOF_MAX_BYTES (default 5MB).
 * - Magic-byte sniffing on confirm (the stored Content-Type is NOT
 *   trusted on its own).
 * - Storage keys are server-generated under
 *   `payment-proofs/{userId}/{submissionId}/{uuid}.{ext}`. Any
 *   client-supplied key that does not match the expected owner prefix is
 *   rejected (anti URL-injection).
 */

export const PROOF_KEY_PREFIX = 'payment-proofs/';

export const PROOF_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type ProofMimeType = (typeof PROOF_ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXTENSION: Record<ProofMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROOF_KEY_PATTERN =
  /^payment-proofs\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/[0-9a-f-]{36}\.(jpg|png|webp)$/i;

export function isAllowedProofMime(mime: string): mime is ProofMimeType {
  return (PROOF_ALLOWED_MIME_TYPES as readonly string[]).includes(mime.toLowerCase());
}

export function extensionForMime(mime: ProofMimeType): string {
  return MIME_TO_EXTENSION[mime];
}

export function isValidUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Server-generated storage key. `uuid` MUST be a fresh random UUID per
 * upload grant (prevents key guessing + overwrites).
 */
export function buildProofStorageKey(
  userId: string,
  submissionId: string,
  mimeType: ProofMimeType,
  uuid: string,
): string {
  if (!isValidUuid(uuid)) {
    throw new Error('buildProofStorageKey requires a valid UUID');
  }
  return `${PROOF_KEY_PREFIX}${userId}/${submissionId}/${uuid}.${extensionForMime(mimeType)}`;
}

/** Expected key prefix binding a key to one (owner, submission) pair. */
export function expectedKeyPrefixFor(userId: string, submissionId: string): string {
  return `${PROOF_KEY_PREFIX}${userId}/${submissionId}/`;
}

/**
 * Ownership/prefix check for a CLIENT-SUPPLIED key on confirm. Rejects:
 * - anything that is not under the caller's own submission prefix
 *   (kills arbitrary URL / foreign-key injection),
 * - absolute URLs, schemes, backslashes, `..` traversal segments,
 * - keys that do not match the generated shape (uuid + allowlisted ext).
 */
export function isKeyOwnedBy(key: string, userId: string, submissionId: string): boolean {
  if (key.length === 0 || key.length > 512) {
    return false;
  }
  if (key.includes('://') || key.includes('\\') || key.split('/').includes('..')) {
    return false;
  }
  if (!key.startsWith(expectedKeyPrefixFor(userId, submissionId))) {
    return false;
  }
  return PROOF_KEY_PATTERN.test(key);
}

export function isProofSizeAccepted(sizeBytes: number, maxBytes: number): boolean {
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
export function detectMimeFromMagicBytes(bytes: Uint8Array): ProofMimeType | null {
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
