/**
 * Password reset service. Owns the one-time reset token lifecycle.
 *
 * Security properties (per docs/05_TECH_ARCHITECTURE.md §6 and the
 * Task #002A CTO spec):
 *   - The raw token is generated with `crypto.randomBytes` (CSPRNG).
 *   - The server stores ONLY the SHA-256 hash of the token.
 *   - The token has a short expiry (default 30 minutes).
 *   - The token is single-use: the first successful consume marks it
 *     `usedAt`. Subsequent consumes fail.
 *   - On successful consume, ALL refresh-token families for the user
 *     are revoked. This forces re-authentication on every device.
 *   - The user's tokenVersion is bumped in the same transaction, so every
 *     previously issued access token is rejected on its next request.
 *   - The public `forgot-password` endpoint always returns 202 and
 *     never reveals whether the contact channel is registered.
 *   - Delivery is email-only in V2.1 and runs in the background: the HTTP
 *     response never waits for the provider and never contains the token.
 *   - A new request invalidates every outstanding token for the account.
 *   - Known and unknown accounts share the same response shape and a
 *     minimum response time, so timing cannot be used for enumeration.
 *
 * Source: docs/05_TECH_ARCHITECTURE.md §6; docs/07_API.md §4.
 */

import { Inject, Injectable, Logger } from '@nestjs/common';

import { RateLimitService } from '../common/rate-limit/rate-limit.service';
import {
  AuthInvalidException,
  RateLimitedException,
  ValidationException,
} from '../common/errors';
import { PrismaService } from '../database/prisma.service';

import { hashPassword } from './password';
import {
  PASSWORD_RESET_DELIVERY,
  type PasswordResetDeliveryPort,
} from './password-reset-delivery.port';
import { generateOpaqueToken, hashToken } from './token.util';

export interface PasswordResetRequestInput {
  email: string;
}

export interface PasswordResetConfirmInput {
  token: string;
  newPassword: string;
}

export interface PasswordResetRequestResult {
  /** Whether a user matched the provided contact channel. */
  accepted: true;
  /** Whether a reset token was actually issued. */
  issued: boolean;
}

const DEFAULT_RESET_TTL_SECONDS = 30 * 60;
const MAX_RESET_TTL_SECONDS = 30 * 60;
/** Response-timing floor shared by known and unknown accounts. */
const MIN_RESPONSE_MS = 150;

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rateLimit: RateLimitService,
    @Inject(PASSWORD_RESET_DELIVERY)
    private readonly delivery: PasswordResetDeliveryPort,
  ) {}

  /**
   * Always returns `accepted: true` regardless of whether a user matched.
   * `issued` reflects whether a reset token was stored. The raw token is
   * handed only to the background delivery adapter; it is never returned
   * in an HTTP response or logged.
   */
  async requestReset(input: PasswordResetRequestInput): Promise<PasswordResetRequestResult> {
    const startedAt = Date.now();
    const email = input.email.trim().toLowerCase();
    if (email.length === 0) {
      throw new ValidationException('email is required');
    }

    // Per-email budget (per-IP is enforced by AuthRateLimitGuard). Keyed by
    // the submitted address, so unknown accounts consume the same budget and
    // the limit never reveals whether an account exists.
    const limit = await this.rateLimit.checkLimit('password-reset', email);
    if (!limit.allowed) {
      throw new RateLimitedException('Too many reset requests. Try again later.');
    }

    const user = await this.prisma.user.findFirst({ where: { email } });

    // A pending email change has not proved ownership of the new address.
    // Do not issue a reset token for it (AUTH-001). The response remains
    // indistinguishable from an unknown account.
    if (user !== null && user.emailChangePending !== true) {
      // A new request invalidates every outstanding token for the account:
      // only the most recent email can be used.
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const ttlSeconds = this.resetTtlSeconds();
      const rawToken = generateOpaqueToken(48);
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      await this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      });

      // Background delivery: the HTTP response must not wait for the email
      // provider. The token never reaches an HTTP response or a log line.
      void this.delivery
        .sendPasswordReset({
          contact: { email: user.email ?? undefined },
          rawToken,
        })
        .catch((error: unknown) => {
          const status = error instanceof Error ? error.name : 'unknown error';
          new Logger(PasswordResetService.name).warn(
            `password reset delivery failed (token not logged): ${status}`,
          );
        });
    }

    // Equalize the practical response time of known and unknown accounts.
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_RESPONSE_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_RESPONSE_MS - elapsed));
    }

    return { accepted: true, issued: user !== null };
  }

  private resetTtlSeconds(): number {
    const parsed = Number.parseInt(
      process.env['PASSWORD_RESET_TTL_SECONDS'] ?? String(DEFAULT_RESET_TTL_SECONDS),
      10,
    );
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return DEFAULT_RESET_TTL_SECONDS;
    }
    // V2.1 hard ceiling: a reset link must never outlive 30 minutes.
    return Math.min(parsed, MAX_RESET_TTL_SECONDS);
  }

  /**
   * Consume a reset token. Validates the hash, expiry, and unused state,
   * then rotates the password and revokes every refresh-token family
   * for the user. Throws on any failure.
   */
  async consumeReset(input: PasswordResetConfirmInput): Promise<void> {
    const tokenHash = hashToken(input.token);

    // Find the most recent unconsumed record for this hash. There can
    // only be one because tokenHash is unique.
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) {
      throw new AuthInvalidException('Invalid or expired reset token');
    }
    if (record.usedAt !== null) {
      // Replay of an already-consumed token is rejected. Do NOT revoke the
      // user's current outstanding token here: possession of an old email
      // must not let anyone invalidate the newest reset link (DoS vector).
      throw new AuthInvalidException('Reset token has already been used');
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new AuthInvalidException('Invalid or expired reset token');
    }

    const newPasswordHash = await hashPassword(input.newPassword);

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      // Atomic single-use claim. The pre-check above is only for a friendly
      // message; concurrent requests must race on this conditional update.
      // Exactly one transaction can flip used_at from NULL; the loser reads
      // count=0 after the winner commits and is rejected.
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) {
        throw new AuthInvalidException('Invalid or expired reset token');
      }

      // Rotate the password and bump tokenVersion in the same write: every
      // access token issued before the reset is rejected by the guard on
      // its next request (its tokenVersion lags the database).
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash, tokenVersion: { increment: 1 } },
      });
      // Invalidate every refresh-token family for this user. This
      // forces re-authentication on every device.
      await tx.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'password_reset' },
      });
    });
  }
}
