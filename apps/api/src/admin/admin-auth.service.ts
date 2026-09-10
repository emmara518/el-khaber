/**
 * Admin authentication service. Separate authority boundary from the
 * three end-user roles. Admin accounts are NOT created via a public
 * registration flow — they are seeded or created out-of-band.
 *
 * Source: docs/09_ADMIN.md §2, §3, §19 and docs/10_ENGINEERING_RULES.md §14, §18.
 */

import { randomUUID } from 'node:crypto';

import {
  USER_STATUS,
  type AuthSessionDto,
  type AuthUserDto,
  type Role,
  type UserStatus,
} from '@khabir/shared-types';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';


import { LoginAttemptGuard } from '../auth/login-attempt.guard';
import { verifyPassword } from '../auth/password';
import { generateOpaqueToken, hashToken } from '../auth/token.util';
import { AuthInvalidException, NotFoundException } from '../common/errors';
import { getConfig } from '../config/app.config';
import { PrismaService } from '../database/prisma.service';

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminMetadata {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly loginAttempts: LoginAttemptGuard,
  ) {}

  async login(input: AdminLoginInput, meta: AdminMetadata): Promise<AuthSessionDto> {
    const identifier = input.email.toLowerCase();
    const ip = meta.ipAddress ?? 'unknown';

    // Same failed-attempt protection and enumeration-safe rejection as
    // the user login (Task 10D §6, §10).
    if (this.loginAttempts.isLocked(identifier, ip)) {
      throw new AuthInvalidException();
    }

    const admin = await this.prisma.adminUser.findUnique({ where: { email: input.email } });
    if (!admin) {
      this.loginAttempts.recordFailure(identifier, ip);
      // Constant-time-ish: still verify a dummy hash.
      await verifyPassword(
        '$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        input.password,
      ).catch(() => undefined);
      throw new AuthInvalidException();
    }
    const ok = await verifyPassword(admin.passwordHash, input.password);
    if (!ok) {
      this.loginAttempts.recordFailure(identifier, ip);
      throw new AuthInvalidException();
    }
    if (admin.status !== USER_STATUS.active) {
      throw new AuthInvalidException('Account is not active');
    }

    this.loginAttempts.recordSuccess(identifier, ip);

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueSession(
      { id: admin.id, role: admin.role, status: admin.status as UserStatus },
      meta,
    );
  }

  async refresh(rawToken: string, meta: AdminMetadata): Promise<AuthSessionDto> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.adminRefreshToken.findUnique({
      where: { tokenHash },
      include: { admin: true },
    });
    if (!record || record.expiresAt.getTime() <= Date.now()) {
      throw new AuthInvalidException('Invalid refresh token');
    }
    if (record.revokedAt !== null) {
      await this.prisma.adminRefreshToken.updateMany({
        where: { familyId: record.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'family_replay' },
      });
      throw new AuthInvalidException('Refresh token replay detected');
    }
    if (record.admin.status !== USER_STATUS.active) {
      throw new AuthInvalidException('Account is not active');
    }
    await this.prisma.adminRefreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date(), revokedReason: 'rotation' },
    });
    return this.issueSession(
      { id: record.admin.id, role: record.admin.role, status: record.admin.status as UserStatus },
      meta,
      record.familyId,
    );
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.adminRefreshToken.findUnique({ where: { tokenHash } });
    if (!record || record.revokedAt !== null) {
      return;
    }
    await this.prisma.adminRefreshToken.updateMany({
      where: { familyId: record.familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' },
    });
  }

  async findAdminById(id: string): Promise<AuthUserDto> {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    return {
      id: admin.id,
      // Admin roles are not one of the three end-user roles, but the
      // AuthUserDto shape requires a `role`. We use a placeholder
      // 'customer' value here only to satisfy the type; the Admin UI
      // uses the admin role from a separate field, not this DTO.
      role: 'customer' as Role,
      status: admin.status as UserStatus,
      phone: null,
      email: admin.email,
      phoneVerified: false,
      emailVerified: false,
      createdAt: admin.createdAt.toISOString(),
    };
  }

  private async issueSession(
    adminRef: { id: string; role: string; status: UserStatus },
    meta: AdminMetadata,
    familyId?: string,
  ): Promise<AuthSessionDto> {
    const config = getConfig();
    const accessToken = await this.jwt.signAsync(
      { sub: adminRef.id, role: adminRef.role, status: adminRef.status, kind: 'admin' },
      {
        secret: config.adminAuth.accessSecret,
        issuer: config.adminAuth.issuer,
        audience: config.adminAuth.audience,
        expiresIn: config.adminAuth.accessTtlSeconds,
      },
    );

    const rawRefresh = generateOpaqueToken(48);
    const tokenHash = hashToken(rawRefresh);
    const family = familyId ?? randomUUID();
    const expiresAt = new Date(Date.now() + config.adminAuth.refreshTtlSeconds * 1000);
    await this.prisma.adminRefreshToken.create({
      data: {
        adminId: adminRef.id,
        tokenHash,
        familyId: family,
        expiresAt,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    const admin = await this.prisma.adminUser.findUniqueOrThrow({ where: { id: adminRef.id } });
    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: config.adminAuth.accessTtlSeconds,
      user: {
        id: admin.id,
        role: 'customer' as Role,
        status: admin.status as UserStatus,
        phone: null,
        email: admin.email,
        phoneVerified: false,
        emailVerified: false,
        createdAt: admin.createdAt.toISOString(),
      },
    };
  }
}
