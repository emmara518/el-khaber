/**
 * Unit tests for the opaque token generator and SHA-256 hashing.
 * Source: docs/10_ENGINEERING_RULES.md §22.
 */

import { describe, expect, it } from 'vitest';

import { generateOpaqueToken, hashToken } from '../src/auth/token.util';

describe('token helpers', () => {
  it('generates an opaque token of the requested length', () => {
    const t = generateOpaqueToken(16);
    // base64url of 16 bytes is 22 chars
    expect(t.length).toBeGreaterThanOrEqual(20);
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('produces a different token on each call', () => {
    const a = generateOpaqueToken(32);
    const b = generateOpaqueToken(32);
    expect(a).not.toBe(b);
  });

  it('hashes a token to a 64-character hex string', () => {
    const hash = hashToken('some-token-value');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('hash is deterministic', () => {
    expect(hashToken('x')).toBe(hashToken('x'));
  });

  it('different tokens produce different hashes', () => {
    expect(hashToken('a')).not.toBe(hashToken('b'));
  });
});
