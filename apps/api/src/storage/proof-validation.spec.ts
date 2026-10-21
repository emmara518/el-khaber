/**
 * Unit tests for proof validation helpers (PHASE 20). Pure functions —
 * no I/O, no NestJS, no credentials required.
 */

import { describe, expect, it } from 'vitest';

import {
  buildProofStorageKey,
  detectMimeFromMagicBytes,
  expectedKeyPrefixFor,
  extensionForMime,
  isAllowedProofMime,
  isKeyOwnedBy,
  isProofSizeAccepted,
  isValidUuid,
  PROOF_ALLOWED_MIME_TYPES,
  PROOF_KEY_PREFIX,
} from './proof-validation';

const USER = 'user-1';
const SUBMISSION = 'sub-1';
const UUID = '123e4567-e89b-42d3-a456-426614174000';

describe('proof key building', () => {
  it('builds keys under payment-proofs/{userId}/{submissionId}/{uuid}.{ext}', () => {
    expect(buildProofStorageKey(USER, SUBMISSION, 'image/jpeg', UUID)).toBe(
      `payment-proofs/${USER}/${SUBMISSION}/${UUID}.jpg`,
    );
    expect(buildProofStorageKey(USER, SUBMISSION, 'image/png', UUID)).toBe(
      `payment-proofs/${USER}/${SUBMISSION}/${UUID}.png`,
    );
    expect(buildProofStorageKey(USER, SUBMISSION, 'image/webp', UUID)).toBe(
      `payment-proofs/${USER}/${SUBMISSION}/${UUID}.webp`,
    );
  });

  it('rejects non-UUID key randomness (prevents guessable keys)', () => {
    expect(() => buildProofStorageKey(USER, SUBMISSION, 'image/jpeg', 'not-a-uuid')).toThrow();
  });

  it('exposes the expected owner prefix', () => {
    expect(expectedKeyPrefixFor(USER, SUBMISSION)).toBe(`payment-proofs/${USER}/${SUBMISSION}/`);
    expect(PROOF_KEY_PREFIX).toBe('payment-proofs/');
  });
});

describe('MIME allowlist', () => {
  it('allows exactly image/jpeg, image/png, image/webp (case-insensitive)', () => {
    expect(PROOF_ALLOWED_MIME_TYPES).toHaveLength(3);
    expect(isAllowedProofMime('image/jpeg')).toBe(true);
    expect(isAllowedProofMime('image/png')).toBe(true);
    expect(isAllowedProofMime('image/webp')).toBe(true);
    expect(isAllowedProofMime('IMAGE/PNG')).toBe(true);
    expect(isAllowedProofMime('image/gif')).toBe(false);
    expect(isAllowedProofMime('application/pdf')).toBe(false);
    expect(isAllowedProofMime('text/html')).toBe(false);
    expect(isAllowedProofMime('')).toBe(false);
  });

  it('maps MIME types to safe extensions', () => {
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('image/png')).toBe('png');
    expect(extensionForMime('image/webp')).toBe('webp');
  });
});

describe('size validation', () => {
  const MAX = 5 * 1024 * 1024;

  it('accepts (0, max] integer sizes only', () => {
    expect(isProofSizeAccepted(1, MAX)).toBe(true);
    expect(isProofSizeAccepted(MAX, MAX)).toBe(true);
    expect(isProofSizeAccepted(0, MAX)).toBe(false);
    expect(isProofSizeAccepted(-10, MAX)).toBe(false);
    expect(isProofSizeAccepted(MAX + 1, MAX)).toBe(false);
    expect(isProofSizeAccepted(1.5, MAX)).toBe(false);
    expect(isProofSizeAccepted(Number.NaN, MAX)).toBe(false);
  });
});

describe('key ownership (anti URL-injection)', () => {
  const owned = buildProofStorageKey(USER, SUBMISSION, 'image/png', UUID);

  it('accepts the server-generated key for the (owner, submission) pair', () => {
    expect(isKeyOwnedBy(owned, USER, SUBMISSION)).toBe(true);
  });

  it('rejects foreign-owner and foreign-submission keys', () => {
    const foreignUser = buildProofStorageKey('user-2', SUBMISSION, 'image/png', UUID);
    const foreignSubmission = buildProofStorageKey(USER, 'sub-2', 'image/png', UUID);
    expect(isKeyOwnedBy(foreignUser, USER, SUBMISSION)).toBe(false);
    expect(isKeyOwnedBy(foreignSubmission, USER, SUBMISSION)).toBe(false);
    // Prefix-sibling attack: user-12 must not match user-1.
    const sibling = buildProofStorageKey('user-1-evil', SUBMISSION, 'image/png', UUID);
    expect(isKeyOwnedBy(sibling, USER, SUBMISSION)).toBe(false);
  });

  it('rejects URLs, traversal, backslashes, wrong extensions', () => {
    expect(isKeyOwnedBy('https://evil.example/p.png', USER, SUBMISSION)).toBe(false);
    expect(isKeyOwnedBy('s3://bucket/payment-proofs/x', USER, SUBMISSION)).toBe(false);
    expect(isKeyOwnedBy(`payment-proofs/${USER}/${SUBMISSION}/../x.png`, USER, SUBMISSION)).toBe(false);
    expect(isKeyOwnedBy(`payment-proofs\\${USER}\\${SUBMISSION}\\${UUID}.png`, USER, SUBMISSION)).toBe(false);
    expect(
      isKeyOwnedBy(`payment-proofs/${USER}/${SUBMISSION}/${UUID}.gif`, USER, SUBMISSION),
    ).toBe(false);
    expect(
      isKeyOwnedBy(`payment-proofs/${USER}/${SUBMISSION}/not-a-uuid.png`, USER, SUBMISSION),
    ).toBe(false);
    expect(isKeyOwnedBy('', USER, SUBMISSION)).toBe(false);
    expect(isKeyOwnedBy('x'.repeat(513), USER, SUBMISSION)).toBe(false);
  });
});

describe('magic-byte detection', () => {
  it('detects JPEG / PNG / WebP signatures', () => {
    expect(detectMimeFromMagicBytes(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(
      detectMimeFromMagicBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe('image/png');
    expect(
      detectMimeFromMagicBytes(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe('image/webp');
  });

  it('returns null for non-images and truncated input', () => {
    expect(detectMimeFromMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull(); // %PDF
    expect(detectMimeFromMagicBytes(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toBeNull(); // GIF8
    expect(detectMimeFromMagicBytes(new Uint8Array([]))).toBeNull();
    expect(detectMimeFromMagicBytes(new Uint8Array([0xff, 0xd8]))).toBeNull();
    // RIFF without the WEBP chunk marker is not WebP.
    expect(
      detectMimeFromMagicBytes(
        new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20]),
      ),
    ).toBeNull();
  });
});

describe('UUID check', () => {
  it('accepts UUIDs and rejects anything else', () => {
    expect(isValidUuid(UUID)).toBe(true);
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('')).toBe(false);
  });
});
