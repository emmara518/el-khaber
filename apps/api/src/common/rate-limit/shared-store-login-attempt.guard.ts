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
    const [pair, perIp, perUser] = await Promise.all([
      this.rateLimit.peekLimit('login', this.key(identifier, ip)),
      this.rateLimit.peekLimit('login-ip', ip),
      this.rateLimit.peekLimit('login-user', identifier),
    ]);
    return !pair.allowed || !perIp.allowed || !perUser.allowed;
  }

  /**
   * Record a failed authentication attempt in all three independent
   * budgets:
   *   - (identifier, ip): 5 failures / 15 min — immediate lock for this pair;
   *   - ip: 5 failures / 15 min — stops spraying many accounts from one host;
   *   - identifier: 20 failures / 60 min across every IP — stops distributed
   *     brute force without letting one IP lock the account for everyone.
   * Budgets auto-expire; there is no permanent lock.
   */
  async recordFailure(identifier: string, ip: string): Promise<void> {
    await Promise.all([
      this.rateLimit.checkLimit('login', this.key(identifier, ip)),
      this.rateLimit.checkLimit('login-ip', ip),
      this.rateLimit.checkLimit('login-user', identifier),
    ]);
  }

  /**
   * Record a successful authentication: clears the pair and the account
   * budget. The source-IP budget is intentionally NOT cleared — otherwise
   * an attacker could reset it by logging into their own account.
   */
  async recordSuccess(identifier: string, ip: string): Promise<void> {
    await Promise.all([
      this.rateLimit.resetLimit('login', this.key(identifier, ip)),
      this.rateLimit.resetLimit('login-user', identifier),
    ]);
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