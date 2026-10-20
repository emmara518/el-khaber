/**
 * Unit tests for avatar key/validation helpers (WP-01).
 *
 * Mirrors the proof-validation contract in the SEPARATE `avatars/`
 * namespace: server-generated keys, owner-prefix binding, MIME
 * allowlist, size gate, magic-byte sniffing, and — critically — refusal
 * to resolve foreign/legacy URLs into delete targets.
 */

import { describe, expect, it } from 'vitest';

import {
  avatarKeyFromPublicUrl,
  AVATAR_KEY_PREFIX,
  buildAvatarStorageKey,
  detectAvatarMimeFromMagicBytes,
  expectedAvatarKeyPrefixFor,
  extensionForAvatarMime,
  isAllowedAvatarMime,
  isAvatarKeyOwnedBy,
  isAvatarSizeAccepted,
  isValidAvatarUuid,
} from './avatar-validation';

const USER = 'user-1';
const UUID = '123e4567-e89b-42d3-a456-426614174000';
const KEY = `avatars/${USER}/${UUID}.png`;

const PNG_PREFIX = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_PREFIX = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
const WEBP_PREFIX = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
const PDF_PREFIX = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0]);

describe('avatar key building', () => {
  it('builds server-generated keys under avatars/{userId}/{uuid}.{ext}', () => {
    expect(buildAvatarStorageKey(USER, 'image/png', UUID)).toBe(KEY);
    expect(buildAvatarStorageKey(USER, 'image/jpeg', UUID)).toBe(`avatars/${USER}/${UUID}.jpg`);
    expect(buildAvatarStorageKey(USER, 'image/webp', UUID)).toBe(`avatars/${USER}/${UUID}.webp`);
  });

  it('rejects non-UUID filenames', () => {
    expect(() => buildAvatarStorageKey(USER, 'image/png', 'not-a-uuid')).toThrow();
  });

  it('uses a dedicated prefix (never payment-proofs/)', () => {
    expect(AVATAR_KEY_PREFIX).toBe('avatars/');
    expect(buildAvatarStorageKey(USER, 'image/png', UUID).startsWith('payment-proofs/')).toBe(
      false,
    );
  });

  it('binds the expected owner prefix', () => {
    expect(expectedAvatarKeyPrefixFor(USER)).toBe(`avatars/${USER}/`);
  });
});

describe('MIME allowlist', () => {
  it('allows jpeg/png/webp only', () => {
    expect(isAllowedAvatarMime('image/jpeg')).toBe(true);
    expect(isAllowedAvatarMime('image/png')).toBe(true);
    expect(isAllowedAvatarMime('image/webp')).toBe(true);
    expect(isAllowedAvatarMime('IMAGE/PNG')).toBe(true);
    expect(isAllowedAvatarMime('image/gif')).toBe(false);
    expect(isAllowedAvatarMime('application/pdf')).toBe(false);
    expect(isAllowedAvatarMime('')).toBe(false);
  });

  it('maps MIME to extension', () => {
    expect(extensionForAvatarMime('image/jpeg')).toBe('jpg');
    expect(extensionForAvatarMime('image/png')).toBe('png');
    expect(extensionForAvatarMime('image/webp')).toBe('webp');
  });
});

describe('size validation', () => {
  it('accepts (0, max] only', () => {
    expect(isAvatarSizeAccepted(1, 2097152)).toBe(true);
    expect(isAvatarSizeAccepted(2097152, 2097152)).toBe(true);
    expect(isAvatarSizeAccepted(0, 2097152)).toBe(false);
    expect(isAvatarSizeAccepted(2097153, 2097152)).toBe(false);
    expect(isAvatarSizeAccepted(-5, 2097152)).toBe(false);
  });
});

describe('key ownership (delete guard)', () => {
  it('accepts own generated keys', () => {
    expect(isAvatarKeyOwnedBy(KEY, USER)).toBe(true);
  });

  it('rejects other users and other namespaces', () => {
    expect(isAvatarKeyOwnedBy(KEY, 'user-2')).toBe(false);
    expect(isAvatarKeyOwnedBy(`payment-proofs/${USER}/sub/${UUID}.png`, USER)).toBe(false);
  });

  it('rejects legacy external URLs (never delete foreign objects)', () => {
    expect(isAvatarKeyOwnedBy('https://cdn.example.com/x.png', USER)).toBe(false);
    expect(isAvatarKeyOwnedBy(`https://cdn.example.com/${KEY}`, USER)).toBe(false);
    expect(isAvatarKeyOwnedBy('data:image/png;base64,AAA', USER)).toBe(false);
  });

  it('rejects traversal and overlong keys', () => {
    expect(isAvatarKeyOwnedBy(`avatars/${USER}/../other/${UUID}.png`, USER)).toBe(false);
    expect(isAvatarKeyOwnedBy('avatars\\user\\x.png', USER)).toBe(false);
    expect(isAvatarKeyOwnedBy(`avatars/${USER}/${'a'.repeat(600)}.png`, USER)).toBe(false);
    expect(isAvatarKeyOwnedBy('', USER)).toBe(false);
  });
});

describe('public-URL to key resolution', () => {
  const base = 'https://cdn.example.com';

  it('resolves own public URLs back to keys', () => {
    expect(avatarKeyFromPublicUrl(`${base}/${KEY}`, base)).toBe(KEY);
    expect(avatarKeyFromPublicUrl(`${base}/${KEY}`, `${base}/`)).toBe(KEY);
  });

  it('returns null for foreign URLs', () => {
    expect(avatarKeyFromPublicUrl('https://other.example.com/x.png', base)).toBeNull();
    expect(avatarKeyFromPublicUrl(`${base}/payment-proofs/a/b/${UUID}.png`, base)).toBeNull();
    expect(avatarKeyFromPublicUrl('data:image/png;base64,AAA', base)).toBeNull();
  });
});

describe('magic-byte detection', () => {
  it('sniffs jpeg/png/webp and rejects the rest', () => {
    expect(detectAvatarMimeFromMagicBytes(PNG_PREFIX)).toBe('image/png');
    expect(detectAvatarMimeFromMagicBytes(JPEG_PREFIX)).toBe('image/jpeg');
    expect(detectAvatarMimeFromMagicBytes(WEBP_PREFIX)).toBe('image/webp');
    expect(detectAvatarMimeFromMagicBytes(PDF_PREFIX)).toBeNull();
    expect(detectAvatarMimeFromMagicBytes(new Uint8Array(0))).toBeNull();
  });
});

describe('UUID check', () => {
  it('validates UUID shape', () => {
    expect(isValidAvatarUuid(UUID)).toBe(true);
    expect(isValidAvatarUuid('nope')).toBe(false);
  });
});
