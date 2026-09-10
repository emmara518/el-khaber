import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginAttemptGuard } from '../src/auth/login-attempt.guard';

/**
 * Unit tests for the failed-login attempt protection (Task 10D §6).
 * Semantics: bounded failures -> temporary lock -> automatic expiry,
 * scoped to the (identifier, ip) PAIR.
 */

describe('login attempt guard', () => {
  beforeEach(() => {
    // getConfig() requires these to be present (it is called by the guard).
    process.env['NODE_ENV'] = 'test';
    process.env['DATABASE_URL'] = process.env['DATABASE_URL'] ?? 'postgresql://test/test';
    process.env['JWT_ACCESS_SECRET'] = process.env['JWT_ACCESS_SECRET'] ?? 'test-access-secret-test-access-secret-32';
    process.env['ADMIN_JWT_ACCESS_SECRET'] =
      process.env['ADMIN_JWT_ACCESS_SECRET'] ?? 'test-admin-secret-test-admin-secret-32';
    process.env['AUTH_MAX_FAILED_LOGINS'] = '3';
    process.env['AUTH_FAILURE_LOCK_SECONDS'] = '60';
    // Clear the cached config so the new thresholds apply.
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env['AUTH_MAX_FAILED_LOGINS'];
    delete process.env['AUTH_FAILURE_LOCK_SECONDS'];
  });

  async function makeGuard(): Promise<LoginAttemptGuard> {
    // Dynamic import AFTER resetModules so getConfig() picks up the
    // test's threshold environment.
    const { LoginAttemptGuard: Fresh } = await import('../src/auth/login-attempt.guard');
    return new Fresh();
  }

  it('does not lock before the threshold is reached', async () => {
    const guard = await makeGuard();
    expect(guard.isLocked('user@example.com', '1.1.1.1')).toBe(false);
    guard.recordFailure('user@example.com', '1.1.1.1');
    guard.recordFailure('user@example.com', '1.1.1.1');
    expect(guard.isLocked('user@example.com', '1.1.1.1')).toBe(false);
  });

  it('locks at the threshold and rejects even correct credentials', async () => {
    const guard = await makeGuard();
    guard.recordFailure('user@example.com', '1.1.1.1');
    guard.recordFailure('user@example.com', '1.1.1.1');
    guard.recordFailure('user@example.com', '1.1.1.1');
    expect(guard.isLocked('user@example.com', '1.1.1.1')).toBe(true);
  });

  it('auto-expires the lock (no permanent lockout / no DoS vector)', async () => {
    vi.useFakeTimers();
    const guard = await makeGuard();
    for (let i = 0; i < 3; i += 1) {
      guard.recordFailure('user@example.com', '1.1.1.1');
    }
    expect(guard.isLocked('user@example.com', '1.1.1.1')).toBe(true);
    vi.advanceTimersByTime(61_000);
    expect(guard.isLocked('user@example.com', '1.1.1.1')).toBe(false);
  });

  it('scopes the lock to the (identifier, ip) pair — third parties cannot lock victims out', async () => {
    const guard = await makeGuard();
    for (let i = 0; i < 5; i += 1) {
      // Attacker hammers a victim's identifier from a different IP.
      guard.recordFailure('victim@example.com', '9.9.9.9');
    }
    expect(guard.isLocked('victim@example.com', '9.9.9.9')).toBe(true);
    // The victim from their own IP is unaffected.
    expect(guard.isLocked('victim@example.com', '10.0.0.2')).toBe(false);
  });

  it('a successful login clears the bounded window', async () => {
    const guard = await makeGuard();
    guard.recordFailure('user@example.com', '1.1.1.1');
    guard.recordFailure('user@example.com', '1.1.1.1');
    guard.recordSuccess('user@example.com', '1.1.1.1');
    guard.recordFailure('user@example.com', '1.1.1.1');
    guard.recordFailure('user@example.com', '1.1.1.1');
    expect(guard.isLocked('user@example.com', '1.1.1.1')).toBe(false);
  });

  it('tracks different identifiers independently', async () => {
    const guard = await makeGuard();
    for (let i = 0; i < 3; i += 1) {
      guard.recordFailure('a@example.com', '1.1.1.1');
    }
    expect(guard.isLocked('a@example.com', '1.1.1.1')).toBe(true);
    expect(guard.isLocked('b@example.com', '1.1.1.1')).toBe(false);
  });
});
