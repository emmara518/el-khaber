/**
 * Shared-store rate limiting (V2-02).
 *
 * Replaces in-memory throttling with a PostgreSQL-backed fixed-window
 * counter. Each bucket is keyed by (policy, identifier) with the window
 * derived from the current time. Different policies (auth, default, etc.)
 * can have different limits and TTLs.
 *
 * Fail-closed: if the database is unavailable, the check throws and the
 * request is rejected. This prevents accidental scale-out without a
 * shared store from bypassing limits.
 *
 * Source: docs/16_V2_READINESS_AUDIT.md P0 item 3.
 */

import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { getConfig } from '../../config/app.config';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
  ttlSeconds: number;
}

export interface RateLimitPolicy {
  name: string;
  max: number;
  ttlSeconds: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly policies: Map<string, RateLimitPolicy>;

  constructor(private readonly prisma: PrismaService) {
    this.policies = this.buildPolicies();
  }

  private buildPolicies(): Map<string, RateLimitPolicy> {
    const config = getConfig();
    return new Map([
      ['default', { name: 'default', max: config.rateLimit.max, ttlSeconds: config.rateLimit.ttlSeconds }],
      ['auth', { name: 'auth', max: config.rateLimit.authMax, ttlSeconds: config.rateLimit.ttlSeconds }],
      ['password-reset', { name: 'password-reset', max: 3, ttlSeconds: 900 }],
      ['login', { name: 'login', max: 5, ttlSeconds: 900 }],
    ]);
  }

  /**
   * Check and increment the rate limit counter for the given policy and identifier.
   * Returns the result with allowance status, remaining count, and reset time.
   * Throws if the database is unreachable (fail-closed).
   */
  async checkLimit(policyName: string, identifier: string): Promise<RateLimitResult> {
    const policy = this.policies.get(policyName);
    if (!policy) {
      this.logger.warn(`Unknown rate limit policy: ${policyName}, falling back to default`);
      return this.checkLimit('default', identifier);
    }

    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / (policy.ttlSeconds * 1000)) * (policy.ttlSeconds * 1000),
    );
    const resetAt = new Date(windowStart.getTime() + policy.ttlSeconds * 1000);

    try {
      const bucket = await this.prisma.$queryRaw<{ count: number }[]>`
        INSERT INTO "rate_limit_buckets" ("policy", "identifier", "window_start", "count")
        VALUES (${policyName}, ${identifier}, ${windowStart}, 1)
        ON CONFLICT ("policy", "identifier", "window_start") DO UPDATE
        SET "count" = "rate_limit_buckets"."count" + 1,
            "updated_at" = now()
        RETURNING "count"
      `;

      const count = Number(bucket[0]?.count ?? 1);
      const remaining = Math.max(0, policy.max - count);
      const allowed = count <= policy.max;

      if (!allowed) {
        this.logger.warn(
          JSON.stringify({
            ts: new Date().toISOString(),
            level: 'warn',
            event: 'rate_limit_exceeded',
            policy: policyName,
            identifier: this.sanitizeIdentifier(identifier),
            count,
            limit: policy.max,
            ttlSeconds: policy.ttlSeconds,
          }),
        );
      }

      return { allowed, remaining, resetAt, limit: policy.max, ttlSeconds: policy.ttlSeconds };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'error',
          event: 'rate_limit_db_error',
          policy: policyName,
          error: error instanceof Error ? error.message : 'unknown',
        }),
      );
      // Fail-closed: reject the request if the shared store is unavailable
      throw error;
    }
  }

  /**
   * Check rate limit without incrementing (for monitoring/debugging).
   */
  async peekLimit(policyName: string, identifier: string): Promise<RateLimitResult> {
    const policy = this.policies.get(policyName) ?? this.policies.get('default')!;
    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / (policy.ttlSeconds * 1000)) * (policy.ttlSeconds * 1000),
    );

    const bucket = await this.prisma.rateLimitBucket.findUnique({
      where: {
        policy_identifier_windowStart: {
          policy: policyName,
          identifier,
          windowStart,
        },
      },
    });

    const count = bucket?.count ?? 0;
    return {
      allowed: count < policy.max,
      remaining: Math.max(0, policy.max - count),
      resetAt: new Date(windowStart.getTime() + policy.ttlSeconds * 1000),
      limit: policy.max,
      ttlSeconds: policy.ttlSeconds,
    };
  }

  /**
   * Reset (delete) the bucket for a given policy and identifier.
   * Useful for admin overrides or testing.
   */
  async resetLimit(policyName: string, identifier: string): Promise<void> {
    const now = new Date();
    const policy = this.policies.get(policyName) ?? this.policies.get('default')!;
    const windowStart = new Date(
      Math.floor(now.getTime() / (policy.ttlSeconds * 1000)) * (policy.ttlSeconds * 1000),
    );

    await this.prisma.rateLimitBucket.deleteMany({
      where: { policy: policyName, identifier, windowStart },
    });
  }

  /**
   * Clean up old buckets outside their window. Call periodically.
   */
  async pruneExpired(): Promise<number> {
    const now = new Date();
    const maxTtl = Math.max(...Array.from(this.policies.values()).map((p) => p.ttlSeconds));
    const cutoff = new Date(now.getTime() - maxTtl * 1000 * 2);

    const result = await this.prisma.rateLimitBucket.deleteMany({
      where: { windowStart: { lt: cutoff } },
    });
    return result.count;
  }

  private sanitizeIdentifier(identifier: string): string {
    // Mask PII in logs: keep first 3 and last 3 chars of email/phone
    if (identifier.includes('@')) {
      const parts = identifier.split('@');
      const local = parts[0] ?? '';
      const domain = parts[1] ?? '';
      return `${local.slice(0, 3)}***@${domain}`;
    }
    if (/^\+?\d+$/.test(identifier)) {
      return `${identifier.slice(0, 3)}***${identifier.slice(-3)}`;
    }
    return `${identifier.slice(0, 3)}***${identifier.slice(-3)}`;
  }
}