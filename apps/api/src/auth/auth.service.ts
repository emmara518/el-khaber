/**
 * Auth service. Owns user/refresh-token lifecycle and session creation.
 *
 * Security properties (per docs/05_TECH_ARCHITECTURE.md §6, §11 and
 * docs/10_ENGINEERING_RULES.md §24):
 *   - Passwords are stored as argon2id hashes. Plaintext is never persisted.
 *   - Refresh tokens are stored as SHA-256 hashes. The raw token is
 *     returned to the client exactly once at issuance.
 *   - Refresh tokens are rotated. Reuse of a previously rotated token
 *     causes the entire family to be revoked (replay detection).
 *   - The role stored on the User record is the only authority. The
 *     registration request may suggest a role, but the server validates
 *     it against the allowed set and persists it verbatim.
 */

import { randomUUID } from 'node:crypto';

import {
  ROLE,
  type AuthSessionDto,
  type AuthUserDto,
  type Role,
} from '@khabir/shared-types';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type Prisma, type UserRole, UserStatus } from '@prisma/client';


import { ConflictException, AuthInvalidException, NotFoundException } from '../common/errors';
import { getConfig } from '../config/app.config';
import { PrismaService } from '../database/prisma.service';

import { LoginAttemptGuard } from './login-attempt.guard';
import { hashPassword, verifyPassword } from './password';
import { generateOpaqueToken, hashToken } from './token.util';

export interface RegisterInput {
  role: Role;
  phone?: string;
  email?: string;
  password: string;
}

export interface LoginInput {
  phone?: string;
  email?: string;
  password: string;
}

export interface AuthMetadata {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly loginAttempts: LoginAttemptGuard,
  ) {}

  async register(input: RegisterInput, meta: AuthMetadata): Promise<AuthSessionDto> {
    if (input.role !== ROLE.customer && input.role !== ROLE.technician && input.role !== ROLE.merchant) {
      throw new ConflictException('Unsupported role');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          input.phone !== undefined ? { phone: input.phone } : { id: '__never__' },
          input.email !== undefined ? { email: input.email } : { id: '__never__' },
        ],
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('phone or email already in use');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.prisma.user.create({
      data: {
        phone: input.phone,
        email: input.email,
        passwordHash,
        role: input.role as UserRole,
        status: UserStatus.active,
      },
    });

    return this.issueSession(
      { id: user.id, role: user.role as Role, status: user.status as UserStatus },
      meta,
    );
  }

  async login(input: LoginInput, meta: AuthMetadata): Promise<AuthSessionDto> {
    if (!input.phone && !input.email) {
      throw new AuthInvalidException();
    }
    const identifier = (input.phone ?? input.email ?? '').toLowerCase();
    const ip = meta.ipAddress ?? 'unknown';

    // Failed-attempt protection (Task 10D): a locked (identifier, ip) pair
    // is rejected with the SAME canonical error as a wrong password so the
    // lock state can never be used to enumerate accounts.
    if (this.loginAttempts.isLocked(identifier, ip)) {
      throw new AuthInvalidException();
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          input.phone !== undefined ? { phone: input.phone } : { id: '__never__' },
          input.email !== undefined ? { email: input.email } : { id: '__never__' },
        ],
      },
    });
    if (!user) {
      // Enumeration safety: unknown identifiers accumulate failures the
      // same way known ones do, keeping lock behavior constant.
      this.loginAttempts.recordFailure(identifier, ip);
      // Constant-time-ish: still verify a dummy hash to reduce timing leak.
      await verifyPassword(
        '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        input.password,
      ).catch(() => undefined);
      throw new AuthInvalidException();
    }
    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) {
      this.loginAttempts.recordFailure(identifier, ip);
      throw new AuthInvalidException();
    }
    if (user.status !== UserStatus.active) {
      throw new AuthInvalidException('Account is not active');
    }

    this.loginAttempts.recordSuccess(identifier, ip);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueSession(
      { id: user.id, role: user.role as Role, status: user.status as UserStatus },
      meta,
    );
  }

  async refresh(rawToken: string, meta: AuthMetadata): Promise<AuthSessionDto> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.expiresAt.getTime() <= Date.now()) {
      throw new AuthInvalidException('Invalid refresh token');
    }

    // If the token was already rotated or revoked, revoke the entire family
    // and treat as a replay attack.
    if (record.revokedAt !== null) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: record.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'family_replay' },
      });
      throw new AuthInvalidException('Refresh token replay detected');
    }

    const user = record.user;
    if (user.status !== UserStatus.active) {
      throw new AuthInvalidException('Account is not active');
    }

    // Rotate: revoke the presented token, issue a new one in the same family.
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), revokedReason: 'rotation' },
    });

    return this.issueSession(
      { id: user.id, role: user.role as Role, status: user.status as UserStatus },
      meta,
      record.familyId,
    );
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!record || record.revokedAt !== null) {
      return;
    }
    await this.prisma.refreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' },
    });
  }

  async findUserById(id: string): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toAuthUserDto(user);
  }

  /**
   * PATCH /me (docs/07_API.md §5). Updates the shared account contact
   * fields only. Security properties:
   *   - Role, status, and verification flags are NOT writable (zod
   *     strips unknown keys; only phone/email reach this method).
   *   - Uniqueness is checked server-side (409 on clash), and the
   *     database unique constraint is the final authority (P2002 → 409).
   *   - Changing a contact channel resets that channel's verification
   *     flag — a new phone/email is unverified by definition.
   */
  async updateContactInfo(
    userId: string,
    input: { phone?: string; email?: string },
  ): Promise<AuthUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const data: {
      phone?: string;
      email?: string;
      phoneVerified?: boolean;
      emailVerified?: boolean;
    } = {};

    if (input.phone !== undefined && input.phone !== user.phone) {
      const clash = await this.prisma.user.findUnique({ where: { phone: input.phone } });
      if (clash !== null && clash.id !== userId) {
        throw new ConflictException('phone already in use');
      }
      data.phone = input.phone;
      data.phoneVerified = false;
    }

    if (input.email !== undefined && input.email !== user.email) {
      const clash = await this.prisma.user.findUnique({ where: { email: input.email } });
      if (clash !== null && clash.id !== userId) {
        throw new ConflictException('email already in use');
      }
      data.email = input.email;
      data.emailVerified = false;
    }

    let updated: Prisma.UserGetPayload<Record<string, never>>;
    try {
      updated = await this.prisma.user.update({ where: { id: userId }, data });
    } catch (error) {
      // Concurrent registration claimed the same contact channel between
      // the check above and this write (P2002 unique violation).
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: string }).code === 'P2002'
      ) {
        throw new ConflictException('phone or email already in use');
      }
      throw error;
    }

    return toAuthUserDto(updated);
  }

  private async issueSession(
    userRef: { id: string; role: Role; status: UserStatus },
    meta: AuthMetadata,
    familyId?: string,
  ): Promise<AuthSessionDto> {
    const config = getConfig();
    const accessToken = await this.jwt.signAsync(
      { sub: userRef.id, role: userRef.role, status: userRef.status },
      {
        secret: config.auth.accessSecret,
        issuer: config.auth.issuer,
        audience: config.auth.audience,
        expiresIn: config.auth.accessTtlSeconds,
      },
    );

    const rawRefresh = generateOpaqueToken(48);
    const tokenHash = hashToken(rawRefresh);
    const family = familyId ?? randomUUID();
    const expiresAt = new Date(Date.now() + config.auth.refreshTtlSeconds * 1000);
    await this.prisma.refreshToken.create({
      data: {
        userId: userRef.id,
        tokenHash,
        familyId: family,
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userRef.id } });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: config.auth.accessTtlSeconds,
      user: toAuthUserDto(user),
    };
  }
}

export function toAuthUserDto(
  user: Prisma.UserGetPayload<Record<string, never>>,
): AuthUserDto {
  return {
    id: user.id,
    role: user.role as Role,
    status: user.status as UserStatus,
    phone: user.phone,
    email: user.email,
    phoneVerified: user.phoneVerified,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}
