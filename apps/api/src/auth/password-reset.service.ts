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
 *   - The public `forgot-password` endpoint always returns 202 and
 *     never reveals whether the contact channel is registered.
 *   - Notification delivery is intentionally out of scope for this
 *     task (CTO amendment). The service returns the raw token so a
 *     future notification adapter can deliver it. In production the
 *     controller must NOT include the token in the HTTP response.
 *
 * Source: docs/05_TECH_ARCHITECTURE.md §6; docs/07_API.md §4.
 */

import { Inject, Injectable } from '@nestjs/common';

import { AuthInvalidException, ValidationException } from '../common/errors';
import { PrismaService } from '../database/prisma.service';

import { hashPassword } from './password';
import {
  PASSWORD_RESET_DELIVERY,
  type PasswordResetDeliveryPort,
} from './password-reset-delivery.port';
import { generateOpaqueToken, hashToken } from './token.util';

export interface PasswordResetRequestInput {
  email?: string;
  phone?: string;
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
  /**
   * The raw reset token. Present only when `issued` is true.
   * Intended for the notification adapter. MUST NOT be included in
   * any HTTP response. The controller must only return `accepted`.
   */
  rawToken?: string;
}

const DEFAULT_RESET_TTL_SECONDS = 30 * 60;

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PASSWORD_RESET_DELIVERY)
    private readonly delivery: PasswordResetDeliveryPort,
  ) {}

  /**
   * Always returns `accepted: true` regardless of whether a user matched.
   * `issued` reflects whether a reset token was stored.
   *
   * The raw token is returned ONLY to the caller (intended to be the
   * notification adapter). The HTTP controller MUST NOT include it in
   * the response.
   */
  async requestReset(input: PasswordResetRequestInput): Promise<PasswordResetRequestResult> {
    if (!input.email && !input.phone) {
      throw new ValidationException('phone or email is required');
    }
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          ...(input.phone !== undefined ? [{ phone: input.phone }] : []),
          ...(input.email !== undefined ? [{ email: input.email }] : []),
        ],
      },
    });
    if (!user) {
      return { accepted: true, issued: false };
    }

    const ttlSeconds = Number.parseInt(
      process.env['PASSWORD_RESET_TTL_SECONDS'] ?? String(DEFAULT_RESET_TTL_SECONDS),
      10,
    );
    const rawToken = generateOpaqueToken(48);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Delivery boundary (Task 10D §4): hand the raw token to the
    // provider-agnostic delivery port. The token never reaches an HTTP
    // response or a log line — only the delivery adapter sees it.
    await this.delivery.sendPasswordReset({
      contact: {
        phone: user.phone ?? undefined,
        email: user.email ?? undefined,
      },
      rawToken,
    });

    return { accepted: true, issued: true, rawToken };
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
      // Token reuse: refuse and revoke any other outstanding tokens for
      // this user as a defense-in-depth measure.
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
      throw new AuthInvalidException('Reset token has already been used');
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new AuthInvalidException('Invalid or expired reset token');
    }

    const newPasswordHash = await hashPassword(input.newPassword);

    await this.prisma.$transaction(async (tx) => {
      // Rotate the password.
      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash: newPasswordHash },
      });
      // Mark this token used.
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      // Invalidate every refresh-token family for this user. This
      // forces re-authentication on every device.
      await tx.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'password_reset' },
      });
    });
  }
}
