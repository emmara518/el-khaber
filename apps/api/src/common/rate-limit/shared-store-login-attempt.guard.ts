/**
 * Shared-store failed-login attempt protection (V2-02).
 *
 * Replaces the in-memory LoginAttemptGuard with a PostgreSQL-backed
 * implementation that works correctly across multiple instances.
 * Uses the same (identifier, ip) scoping and anti-enumeration design.
 *
 * Source: docs/16_V2_READINESS_AUDIT.md P0 item 3.
 */

import { Injectable } from '@nestjs/common';

import { RateLimitService } from './rate-limit.service';
import { getConfig } from '../../config/app.config';

@Injectable()
export class SharedStoreLoginAttemptGuard {
  constructor(private readonly rateLimit: RateLimitService) {}

  /**
   * Whether attempts for this (identifier, ip) are currently locked.
   * Uses the 'login' policy: 5 failures within 900s window triggers lockout.
   */
  async isLocked(identifier: string, ip: string): Promise<boolean> {
    const key = this.key(identifier, ip);
    const result = await this.rateLimit.peekLimit('login', key);
    return !result.allowed;
  }

  /**
   * Record a failed authentication attempt for this (identifier, ip).
   * Uses the 'login' policy with atomic increment.
   */
  async recordFailure(identifier: string, ip: string): Promise<void> {
    const key = this.key(identifier, ip);
    await this.rateLimit.checkLimit('login', key);
  }

  /**
   * Record a successful authentication: reset the failure window.
   * Deletes the bucket so the next failure starts a fresh window.
   */
  async recordSuccess(identifier: string, ip: string): Promise<void> {
    const key = this.key(identifier, ip);
    await this.rateLimit.resetLimit('login', key);
  }

  /** Test/operational hook: clear all login attempt state. */
  async clearAll(): Promise<void> {
    // Not directly supported without admin API; pruneExpired covers cleanup.
    // For tests, we can use resetLimit with known keys.
  }

  private key(identifier: string, ip: string): string {
    return `${identifier}|${ip}`;
  }
}

/**
 * Convenience function to get the login policy config.
 * Mirrors the config used in app.config.ts for identity.
 */
export function getLoginPolicyConfig() {
  const { identity } = getConfig();
  return {
    maxFailedLogins: identity.maxFailedLogins,
    failureLockSeconds: identity.failureLockSeconds,
  };
}