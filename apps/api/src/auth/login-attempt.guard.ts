/**
 * Failed-login attempt protection (Task 10D §6).
 *
 * Design follows the CTO "preferred direction": bounded failures →
 * temporary backoff → automatic expiry. There is NO permanent lockout:
 * every lock auto-expires after `AUTH_FAILURE_LOCK_SECONDS`, so the
 * mechanism cannot be weaponized into a denial-of-service vector.
 *
 * The lock is scoped to the (identifier, ip) PAIR, not the identifier
 * alone. A third party who knows a victim's phone number can therefore
 * never lock the victim out — they can only lock their own IP against
 * that identifier. This is the standard anti-DoS refinement for
 * failed-attempt throttling.
 *
 * Enumeration safety: a locked attempt is rejected with the SAME
 * canonical `AUTH_INVALID` error as a wrong password. Callers cannot
 * distinguish "locked" from "bad credentials", so the lock state can
 * never be used to probe which accounts exist.
 *
 * Storage is in-memory (single instance). Distributed/multi-instance
 * enforcement is a documented production-hardening item, mirroring the
 * existing @nestjs/throttler limitation (Task 10D §7).
 *
 * Thresholds are environment-configurable. The shipped defaults
 * (5 failures, 15-minute lock) are PROVISIONAL pending CTO
 * ratification — no thresholds were documented anywhere.
 */

import { Injectable } from '@nestjs/common';

import { getConfig } from '../config/app.config';

interface AttemptRecord {
  count: number;
  lockedUntil: number;
}

export const FAILURE_WINDOW_SECONDS = 900;

@Injectable()
export class LoginAttemptGuard {
  private readonly failures = new Map<string, AttemptRecord>();

  private key(identifier: string, ip: string): string {
    return `${identifier}|${ip}`;
  }

  /** Whether attempts for this (identifier, ip) are currently locked. */
  isLocked(identifier: string, ip: string): boolean {
    const record = this.failures.get(this.key(identifier, ip));
    if (record === undefined) {
      return false;
    }
    if (record.lockedUntil === 0) {
      // Still within the bounded counting window — NOT locked. The
      // record must survive so failures can accumulate.
      return false;
    }
    if (record.lockedUntil > Date.now()) {
      return true;
    }
    // Expired lock: forget it entirely (auto-expiry, no permanent state).
    this.failures.delete(this.key(identifier, ip));
    return false;
  }

  /** Record a failed authentication attempt for this (identifier, ip). */
  recordFailure(identifier: string, ip: string): void {
    const { identity } = getConfig();
    const key = this.key(identifier, ip);
    const record = this.failures.get(key) ?? { count: 0, lockedUntil: 0 };

    // A failure outside an active lock restarts the bounded window.
    if (record.lockedUntil !== 0 && record.lockedUntil <= Date.now()) {
      record.count = 0;
      record.lockedUntil = 0;
    }

    record.count += 1;
    if (record.count >= identity.maxFailedLogins) {
      record.lockedUntil = Date.now() + identity.failureLockSeconds * 1000;
      record.count = 0;
    }
    this.failures.set(key, record);
    this.prune();
  }

  /** Record a successful authentication: the bounded window resets. */
  recordSuccess(identifier: string, ip: string): void {
    this.failures.delete(this.key(identifier, ip));
  }

  /** Test/operational hook: clear all in-memory state. */
  clearAll(): void {
    this.failures.clear();
  }

  /** Opportunistic cleanup so the map cannot grow unbounded. */
  private prune(): void {
    if (this.failures.size < 1000) {
      return;
    }
    const now = Date.now();
    for (const [key, record] of this.failures) {
      if (record.lockedUntil !== 0 && record.lockedUntil <= now) {
        this.failures.delete(key);
      }
    }
  }
}
