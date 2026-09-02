/**
 * Unit tests for the password hashing helpers.
 * Source: docs/10_ENGINEERING_RULES.md §22 (Testing).
 */

import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '../src/auth/password';

describe('password helpers', () => {
  it('hashes a password and verifies it', async () => {
    const hash = await hashPassword('CorrectHorseBattery9');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('CorrectHorseBattery9');
    expect(await verifyPassword(hash, 'CorrectHorseBattery9')).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('CorrectHorseBattery9');
    expect(await verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('returns false for an empty input rather than throwing', async () => {
    const hash = await hashPassword('CorrectHorseBattery9');
    expect(await verifyPassword(hash, '')).toBe(false);
  });

  it('returns false for an empty hash rather than throwing', async () => {
    expect(await verifyPassword('', 'CorrectHorseBattery9')).toBe(false);
  });

  it('produces different hashes for the same input (salt randomness)', async () => {
    const a = await hashPassword('CorrectHorseBattery9');
    const b = await hashPassword('CorrectHorseBattery9');
    expect(a).not.toBe(b);
    expect(await verifyPassword(a, 'CorrectHorseBattery9')).toBe(true);
    expect(await verifyPassword(b, 'CorrectHorseBattery9')).toBe(true);
  });
});
