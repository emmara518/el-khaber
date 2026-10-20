/**
 * Unit tests for access-token revocation via tokenVersion.
 *
 * The access-token JWT carries the subject's tokenVersion. The guard
 * compares the claim against the database on every request, so a security
 * event that bumps the column (logout, password reset) invalidates every
 * older access token on its next request instead of after the TTL.
 */

import { JwtService } from '@nestjs/jwt';
import { beforeAll, describe, expect, it, vi } from 'vitest';

process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-test-access-secret-32';
process.env['ADMIN_JWT_ACCESS_SECRET'] = 'test-admin-secret-test-admin-secret-32';

import { JwtAuthGuard } from '../src/common/jwt-auth.guard';
import { AuthRequiredException } from '../src/common/errors';
import { AUTH_KIND_METADATA_KEY } from '../src/common/decorators';
import { PrismaService } from '../src/database/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { AdminAuthService } from '../src/admin/admin-auth.service';
import { PasswordResetService } from '../src/auth/password-reset.service';
import { hashPassword } from '../src/auth/password';
import { hashToken } from '../src/auth/token.util';
import { SharedStoreLoginAttemptGuard } from '../src/common/rate-limit/shared-store-login-attempt.guard';

import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

const USER_JWT_CONFIG = {
  secret: 'test-access-secret-test-access-secret-32',
  signOptions: { issuer: 'khabir-api', audience: 'khabir' },
} as const;

const ADMIN_JWT_CONFIG = {
  secret: 'test-admin-secret-test-admin-secret-32',
  signOptions: { issuer: 'khabir-admin-api', audience: 'khabir-admin' },
} as const;

function makeLoginAttempts(): SharedStoreLoginAttemptGuard {
  return {
    isLocked: vi.fn(() => false),
    recordFailure: vi.fn(),
    recordSuccess: vi.fn(),
    clearAll: vi.fn(),
  } as unknown as SharedStoreLoginAttemptGuard;
}

function makeGuard(prisma: PrismaService, jwt: JwtService, adminKind = false): JwtAuthGuard {
  const reflector = {
    getAllAndOverride: vi.fn((key: string) =>
      adminKind && key === AUTH_KIND_METADATA_KEY ? 'admin' : undefined,
    ),
  } as unknown as Reflector;
  return new JwtAuthGuard(reflector, jwt, prisma);
}

interface MockRequest {
  headers: Record<string, string>;
  user?: unknown;
}

function makeContext(authHeader: string): { context: ExecutionContext; req: MockRequest } {
  const req: MockRequest = { headers: { authorization: authHeader } };
  const context = {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
  return { context, req };
}

function makeUserPrisma(
  user: {
    id: string;
    role: string;
    status: string;
    tokenVersion: number;
  } | null,
): PrismaService {
  return {
    user: { findFirst: vi.fn(async () => user) },
    adminUser: { findUnique: vi.fn(async () => null) },
  } as unknown as PrismaService;
}

function makeAdminPrisma(
  admin: {
    id: string;
    status: string;
    tokenVersion: number;
  } | null,
): PrismaService {
  return {
    user: { findFirst: vi.fn(async () => null) },
    adminUser: { findUnique: vi.fn(async () => admin) },
  } as unknown as PrismaService;
}

beforeAll(() => {
  // getConfig() caches on first call; the vitest config already pins
  // DATABASE_URL/DIRECT_URL to test-only values.
  process.env['JWT_ACCESS_SECRET'] = USER_JWT_CONFIG.secret;
  process.env['ADMIN_JWT_ACCESS_SECRET'] = ADMIN_JWT_CONFIG.secret;
});

describe('JwtAuthGuard tokenVersion verification', () => {
  it('accepts a token whose tokenVersion matches the database', async () => {
    const jwt = new JwtService(USER_JWT_CONFIG);
    const token = await jwt.signAsync({
      sub: 'u1',
      role: 'customer',
      status: 'active',
      tokenVersion: 0,
    });
    const prisma = makeUserPrisma({
      id: 'u1',
      role: 'customer',
      status: 'active',
      tokenVersion: 0,
    });
    const guard = makeGuard(prisma, jwt);

    const { context, req } = makeContext(`Bearer ${token}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.user).toMatchObject({
      id: 'u1',
      role: 'customer',
      status: 'active',
      authKind: 'user',
    });
  });

  it('rejects a token with a stale tokenVersion (after logout) with "Token has been revoked"', async () => {
    const jwt = new JwtService(USER_JWT_CONFIG);
    // Token was issued before the logout bumped the database to version 1.
    const staleToken = await jwt.signAsync({
      sub: 'u1',
      role: 'customer',
      status: 'active',
      tokenVersion: 0,
    });
    const prisma = makeUserPrisma({
      id: 'u1',
      role: 'customer',
      status: 'active',
      tokenVersion: 1,
    });
    const guard = makeGuard(prisma, jwt);

    const { context } = makeContext(`Bearer ${staleToken}`);
    await expect(guard.canActivate(context)).rejects.toThrow(AuthRequiredException);
    await expect(guard.canActivate(context)).rejects.toThrow('Token has been revoked');
  });

  it('rejects a token with a stale tokenVersion (after password reset)', async () => {
    const jwt = new JwtService(USER_JWT_CONFIG);
    const tx = {
      user: { update: vi.fn(async () => undefined) },
      passwordResetToken: { update: vi.fn(async () => undefined) },
      refreshToken: { updateMany: vi.fn(async () => undefined) },
    };
    const prisma = {
      passwordResetToken: {
        findUnique: vi.fn(async () => ({
          id: 'prt1',
          userId: 'u1',
          tokenHash: hashToken('reset-token'),
          expiresAt: new Date(Date.now() + 60_000),
          usedAt: null,
          user: { id: 'u1' },
        })),
      },
      $transaction: vi.fn(async (fn: (txArg: unknown) => Promise<unknown>) => fn(tx)),
    } as unknown as PrismaService;

    const resetService = new PasswordResetService(prisma, { sendPasswordReset: vi.fn() });
    await resetService.consumeReset({ token: 'reset-token', newPassword: 'newPassw0rd!' });

    // The reset bumped tokenVersion; the pre-reset access token is now stale.
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { passwordHash: expect.any(String), tokenVersion: { increment: 1 } },
    });

    const staleToken = await jwt.signAsync({
      sub: 'u1',
      role: 'customer',
      status: 'active',
      tokenVersion: 0,
    });
    const guardPrisma = makeUserPrisma({
      id: 'u1',
      role: 'customer',
      status: 'active',
      tokenVersion: 1,
    });
    const guard = makeGuard(guardPrisma, jwt);

    const { context } = makeContext(`Bearer ${staleToken}`);
    await expect(guard.canActivate(context)).rejects.toThrow('Token has been revoked');
  });

  it('does not affect valid sessions: a token carrying the current tokenVersion keeps working', async () => {
    const jwt = new JwtService(USER_JWT_CONFIG);
    // After the bump, a freshly issued token embeds the new version and
    // is accepted — only pre-event tokens are rejected.
    const freshToken = await jwt.signAsync({
      sub: 'u1',
      role: 'customer',
      status: 'active',
      tokenVersion: 1,
    });
    const prisma = makeUserPrisma({
      id: 'u1',
      role: 'customer',
      status: 'active',
      tokenVersion: 1,
    });
    const guard = makeGuard(prisma, jwt);

    const { context } = makeContext(`Bearer ${freshToken}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('accepts an admin token whose tokenVersion matches and rejects a stale one', async () => {
    const jwt = new JwtService(ADMIN_JWT_CONFIG);
    const adminToken = await jwt.signAsync({
      sub: 'a1',
      role: 'super_admin',
      status: 'active',
      kind: 'admin',
      tokenVersion: 2,
    });
    const prisma = makeAdminPrisma({ id: 'a1', status: 'active', tokenVersion: 2 });
    const guard = makeGuard(prisma, jwt, true);

    const { context } = makeContext(`Bearer ${adminToken}`);
    await expect(guard.canActivate(context)).resolves.toBe(true);

    const staleAdminToken = await jwt.signAsync({
      sub: 'a1',
      role: 'super_admin',
      status: 'active',
      kind: 'admin',
      tokenVersion: 1,
    });
    const stalePrisma = makeAdminPrisma({ id: 'a1', status: 'active', tokenVersion: 2 });
    const staleGuard = makeGuard(stalePrisma, jwt, true);

    const { context: staleContext } = makeContext(`Bearer ${staleAdminToken}`);
    await expect(staleGuard.canActivate(staleContext)).rejects.toThrow('Token has been revoked');
  });
});

describe('AuthService tokenVersion issuance and revocation', () => {
  it('embeds the database tokenVersion in the issued access token', async () => {
    const jwt = new JwtService(USER_JWT_CONFIG);
    const passwordHash = await hashPassword('sup3rsecretP4ss');
    const prisma = {
      user: {
        findFirst: vi.fn(async () => ({
          id: 'u1',
          email: 'u@example.com',
          passwordHash,
          role: 'customer',
          status: 'active',
        })),
        update: vi.fn(async () => undefined),
        findUniqueOrThrow: vi.fn(async () => ({
          id: 'u1',
          email: 'u@example.com',
          role: 'customer',
          status: 'active',
          tokenVersion: 0,
          phone: null,
          phoneVerified: false,
          emailVerified: false,
          createdAt: new Date(),
        })),
      },
      refreshToken: { create: vi.fn(async () => undefined) },
      // WP-01: issueSession resolves the role-appropriate profile image;
      // no profile row here → avatarUrl: null (covered explicitly).
      customerProfile: { findFirst: vi.fn(async () => null) },
    } as unknown as PrismaService;

    const service = new AuthService(prisma, jwt, makeLoginAttempts());
    const session = await service.login(
      { email: 'u@example.com', password: 'sup3rsecretP4ss' },
      {},
    );

    const payload = jwt.decode(session.accessToken) as { tokenVersion: number };
    expect(payload.tokenVersion).toBe(0);
  });

  it('revokeAllSessions increments tokenVersion', async () => {
    const jwt = new JwtService(USER_JWT_CONFIG);
    const update = vi.fn(async () => undefined);
    const prisma = {
      user: { update },
      refreshToken: { create: vi.fn(async () => undefined) },
    } as unknown as PrismaService;

    const service = new AuthService(prisma, jwt, makeLoginAttempts());
    await service.revokeAllSessions('u1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  it('logout revokes the refresh family and bumps tokenVersion', async () => {
    const jwt = new JwtService(USER_JWT_CONFIG);
    const update = vi.fn(async () => undefined);
    const refreshTokenUpdateMany = vi.fn(async () => ({ count: 1 }));
    const prisma = {
      user: { update },
      refreshToken: {
        findUnique: vi.fn(async () => ({
          id: 'rt1',
          userId: 'u1',
          familyId: 'f1',
          revokedAt: null,
        })),
        updateMany: refreshTokenUpdateMany,
      },
    } as unknown as PrismaService;

    const service = new AuthService(prisma, jwt, makeLoginAttempts());
    await service.logout('raw-refresh-token');

    expect(refreshTokenUpdateMany).toHaveBeenCalledWith({
      where: { familyId: 'f1', revokedAt: null },
      data: { revokedAt: expect.any(Date), revokedReason: 'logout' },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { tokenVersion: { increment: 1 } },
    });
  });
});

describe('AdminAuthService tokenVersion issuance and revocation', () => {
  it('embeds the database tokenVersion in the issued admin access token', async () => {
    const jwt = new JwtService(ADMIN_JWT_CONFIG);
    const passwordHash = await hashPassword('AdminPassw0rd!');
    const prisma = {
      adminUser: {
        findUnique: vi.fn(async () => ({
          id: 'a1',
          email: 'admin@example.com',
          passwordHash,
          role: 'super_admin',
          status: 'active',
        })),
        update: vi.fn(async () => undefined),
        findUniqueOrThrow: vi.fn(async () => ({
          id: 'a1',
          email: 'admin@example.com',
          role: 'super_admin',
          status: 'active',
          tokenVersion: 3,
          createdAt: new Date(),
        })),
      },
      adminRefreshToken: { create: vi.fn(async () => undefined) },
    } as unknown as PrismaService;

    const service = new AdminAuthService(prisma, jwt, makeLoginAttempts());
    const session = await service.login(
      { email: 'admin@example.com', password: 'AdminPassw0rd!' },
      {},
    );

    const payload = jwt.decode(session.accessToken) as { tokenVersion: number; kind: string };
    expect(payload.kind).toBe('admin');
    expect(payload.tokenVersion).toBe(3);
  });

  it('logout revokes the admin refresh family and bumps tokenVersion', async () => {
    const jwt = new JwtService(ADMIN_JWT_CONFIG);
    const adminUpdate = vi.fn(async () => undefined);
    const refreshTokenUpdateMany = vi.fn(async () => ({ count: 1 }));
    const prisma = {
      adminUser: { update: adminUpdate },
      adminRefreshToken: {
        findUnique: vi.fn(async () => ({
          id: 'art1',
          adminId: 'a1',
          familyId: 'af1',
          revokedAt: null,
        })),
        updateMany: refreshTokenUpdateMany,
      },
    } as unknown as PrismaService;

    const service = new AdminAuthService(prisma, jwt, makeLoginAttempts());
    await service.logout('raw-admin-refresh-token');

    expect(refreshTokenUpdateMany).toHaveBeenCalledWith({
      where: { familyId: 'af1', revokedAt: null },
      data: { revokedAt: expect.any(Date), revokedReason: 'logout' },
    });
    expect(adminUpdate).toHaveBeenCalledWith({
      where: { id: 'a1' },
      data: { tokenVersion: { increment: 1 } },
    });
  });
});
