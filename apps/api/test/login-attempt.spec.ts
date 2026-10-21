import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginAttemptGuard } from '../src/auth/login-attempt.guard';
import { SharedStoreLoginAttemptGuard } from '../src/common/rate-limit/shared-store-login-attempt.guard';
import { RateLimitService } from '../src/common/rate-limit/rate-limit.service';
import { createFakePrisma } from './fake-prisma';

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

describe('SharedStoreLoginAttemptGuard', () => {
  function makeSharedGuard(): SharedStoreLoginAttemptGuard {
    const prisma = createFakePrisma();
    const rateLimit = new RateLimitService(prisma as never);
    return new SharedStoreLoginAttemptGuard(rateLimit);
  }

  beforeEach(() => {
    process.env['NODE_ENV'] = 'test';
    process.env['DATABASE_URL'] = process.env['DATABASE_URL'] ?? 'postgresql://test/test';
    process.env['JWT_ACCESS_SECRET'] = process.env['JWT_ACCESS_SECRET'] ?? 'test-access-secret-test-access-secret-32';
    process.env['ADMIN_JWT_ACCESS_SECRET'] =
      process.env['ADMIN_JWT_ACCESS_SECRET'] ?? 'test-admin-secret-test-admin-secret-32';
    process.env['RATE_LIMIT_TTL'] = '60';
    process.env['RATE_LIMIT_MAX'] = '1000';
    process.env['AUTH_RATE_LIMIT_MAX'] = '1000';
    vi.resetModules();
  });

  it('isLocked returns false when no failures recorded', async () => {
    const guard = makeSharedGuard();
    await expect(guard.isLocked('user@example.com', '1.1.1.1')).resolves.toBe(false);
  });

  it('isLocked returns false when under the limit', async () => {
    const guard = makeSharedGuard();
    await guard.recordFailure('user@example.com', '1.1.1.1');
    await guard.recordFailure('user@example.com', '1.1.1.1');
    await expect(guard.isLocked('user@example.com', '1.1.1.1')).resolves.toBe(false);
  });

  it('isLocked returns true when limit exceeded', async () => {
    const guard = makeSharedGuard();
    for (let i = 0; i < 6; i += 1) {
      await guard.recordFailure('user@example.com', '1.1.1.1');
    }
    await expect(guard.isLocked('user@example.com', '1.1.1.1')).resolves.toBe(true);
  });

  it('recordSuccess resets the failure counter', async () => {
    const guard = makeSharedGuard();
    await guard.recordFailure('user@example.com', '1.1.1.1');
    await guard.recordFailure('user@example.com', '1.1.1.1');
    await guard.recordSuccess('user@example.com', '1.1.1.1');
    await expect(guard.isLocked('user@example.com', '1.1.1.1')).resolves.toBe(false);
  });

  it('scopes the lock to the (identifier, ip) pair', async () => {
    const guard = makeSharedGuard();
    for (let i = 0; i < 6; i += 1) {
      await guard.recordFailure('victim@example.com', '9.9.9.9');
    }
    await expect(guard.isLocked('victim@example.com', '9.9.9.9')).resolves.toBe(true);
    await expect(guard.isLocked('victim@example.com', '10.0.0.2')).resolves.toBe(false);
  });

  it('the per-IP budget covers every identifier on that host', async () => {
    const guard = makeSharedGuard();
    for (let i = 0; i < 6; i += 1) {
      await guard.recordFailure('a@example.com', '1.1.1.1');
    }
    await expect(guard.isLocked('a@example.com', '1.1.1.1')).resolves.toBe(true);
    // Same host, different account: blocked by the IP budget.
    await expect(guard.isLocked('b@example.com', '1.1.1.1')).resolves.toBe(true);
    // Different host, different account: not blocked.
    await expect(guard.isLocked('b@example.com', '2.2.2.2')).resolves.toBe(false);
  });

  it('uses composite key identifier|ip', async () => {
    const prisma = createFakePrisma();
    const rateLimit = new RateLimitService(prisma as never);
    const spy = vi.spyOn(rateLimit, 'checkLimit');
    const sharedGuard = new SharedStoreLoginAttemptGuard(rateLimit);
    await sharedGuard.recordFailure('user@example.com', '1.1.1.1');
    expect(spy).toHaveBeenCalledWith('login', 'user@example.com|1.1.1.1');
  });
});
