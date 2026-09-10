/**
 * End-to-end tests for identity hardening (Task 10D):
 *   - password-reset delivery boundary (token never in HTTP responses;
 *     adapter receives it; reset + family invalidation end-to-end)
 *   - failed-login protection (bounded failures -> temporary lock ->
 *     auto expiry, enumeration-safe rejection)
 *   - authority isolation in both directions (user roles vs admin)
 *
 * Bootstraps the compiled NestJS app against the in-memory FakePrisma
 * client exactly like `auth.e2e.spec.ts`. The same DB-safety guard applies.
 */

import { createRequire } from 'node:module';

import { Test } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';


import { AppModule } from '../dist/app.module';
import { getConfig } from '../dist/config/app.config';

import { createFakePrisma, type FakePrismaClient } from './fake-prisma';

import type { INestApplication } from '@nestjs/common';
import type { Provider } from '@nestjs/common';

const requireCjs = createRequire(import.meta.url);
const { PrismaService } = requireCjs('../dist/database/prisma.service') as {
  PrismaService: new (...args: unknown[]) => unknown;
};
const { LoginAttemptGuard } = requireCjs('../dist/auth/login-attempt.guard') as {
  LoginAttemptGuard: new (...args: unknown[]) => { isLocked: (i: string, ip: string) => boolean; clearAll: () => void };
};
const {
  PASSWORD_RESET_DELIVERY,
} = requireCjs('../dist/auth/password-reset-delivery.port') as {
  PASSWORD_RESET_DELIVERY: symbol;
};

const PASSWORD = 'sup3rsecretP4ss';

interface Session {
  accessToken: string;
  refreshToken: string;
}

async function register(
  app: INestApplication,
  body: Record<string, unknown>,
): Promise<Session> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ role: 'customer', password: PASSWORD, ...body })
    .expect(201);
  return res.body.data as Session;
}

describe('identity hardening e2e', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;
  let delivered: Array<{ contact: { phone?: string; email?: string }; rawToken: string }>;

  beforeAll(async () => {
    const dbUrl = process.env['DATABASE_URL'] ?? '';
    if (/supabase\.com|supabase\.co/i.test(dbUrl)) {
      throw new Error(
        'E2E database safety: a real Supabase URL is configured. The e2e suite uses the in-memory FakePrismaClient and must NOT run against a real database. Unset DATABASE_URL or set it to a clearly-test-only value (e.g. postgresql://test/test).',
      );
    }

    process.env['NODE_ENV'] = 'test';
    process.env['PORT'] = '0';
    process.env['API_GLOBAL_PREFIX'] = 'api/v1';
    process.env['CORS_ORIGINS'] = '';
    process.env['DATABASE_URL'] = 'postgresql://test/test';
    process.env['DIRECT_URL'] = 'postgresql://test/test';
    process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-test-access-secret-32';
    process.env['JWT_ACCESS_TTL'] = '900';
    process.env['JWT_REFRESH_TTL'] = '2592000';
    process.env['JWT_ISSUER'] = 'khabir-api';
    process.env['JWT_AUDIENCE'] = 'khabir';
    process.env['ADMIN_JWT_ACCESS_SECRET'] = 'test-admin-secret-test-admin-secret-32';
    process.env['ADMIN_JWT_ACCESS_TTL'] = '900';
    process.env['ADMIN_JWT_REFRESH_TTL'] = '2592000';
    process.env['ADMIN_JWT_ISSUER'] = 'khabir-admin-api';
    process.env['ADMIN_JWT_AUDIENCE'] = 'khabir-admin';
    process.env['RATE_LIMIT_TTL'] = '60';
    process.env['RATE_LIMIT_MAX'] = '1000';
    process.env['AUTH_RATE_LIMIT_MAX'] = '1000';
    process.env['PASSWORD_RESET_TTL_SECONDS'] = '1800';

    prisma = createFakePrisma();
    delivered = [];

    const deliverySpy: Provider = {
      provide: PASSWORD_RESET_DELIVERY,
      useValue: {
        sendPasswordReset: async (message: { contact: { phone?: string; email?: string }; rawToken: string }) => {
          delivered.push(message);
        },
      },
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(PASSWORD_RESET_DELIVERY)
      .useValue(deliverySpy.useValue)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(getConfig().globalPrefix);
    await app.init();
  });

  beforeEach(() => {
    prisma.users.length = 0;
    prisma.refreshTokens.length = 0;
    prisma.passwordResetTokens.length = 0;
    prisma.adminUsers.length = 0;
    prisma.adminRefreshTokens.length = 0;
    delivered.length = 0;
    app.get(LoginAttemptGuard).clearAll();
  });

  describe('password reset delivery boundary', () => {
    it('hands the raw token ONLY to the delivery port — never in the HTTP response', async () => {
      await register(app, { email: 'reset1@example.com' });
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'reset1@example.com' })
        .expect(202);

      // Response reveals nothing but acceptance.
      expect(res.body).toEqual({ data: { accepted: true } });
      expect(JSON.stringify(res.body)).not.toMatch(/eyJ|token/i);
      // The delivery port received the raw token.
      expect(delivered).toHaveLength(1);
      expect(delivered[0]?.contact.email).toBe('reset1@example.com');
      expect(delivered[0]?.rawToken).toBeTypeOf('string');
      expect((delivered[0]?.rawToken ?? '').length).toBeGreaterThanOrEqual(20);
    });

    it('invokes delivery for known accounts only (enumeration safety)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody@example.com' })
        .expect(202);
      expect(delivered).toHaveLength(0);
    });

    it('completes the loop: delivered token resets the password and invalidates every session', async () => {
      const first = await register(app, { email: 'reset2@example.com' });
      // A second session (second login) from the same account.
      const second = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'reset2@example.com', password: PASSWORD })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'reset2@example.com' })
        .expect(202);
      const rawToken = delivered[0]?.rawToken ?? '';

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: rawToken, password: 'brandnewP4ssw0rd' })
        .expect(204);

      // All previously issued refresh families are revoked.
      for (const session of [first, second.body.data as Session]) {
        const replay = await request(app.getHttpServer())
          .post('/api/v1/auth/refresh')
          .send({ refreshToken: session.refreshToken });
        expect(replay.status).toBe(401);
      }
      // Login works with the NEW password only.
      const oldLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'reset2@example.com', password: PASSWORD });
      expect(oldLogin.status).toBe(401);
      const newLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'reset2@example.com', password: 'brandnewP4ssw0rd' })
        .expect(200);
      expect(newLogin.body.data.accessToken).toBeTypeOf('string');
    });
  });

  describe('failed-login protection', () => {
    it('locks after the bounded threshold and rejects even correct credentials with the canonical error', async () => {
      await register(app, { email: 'locked@example.com' });

      // Default threshold: 5 (no AUTH_MAX_FAILED_LOGINS set in test env).
      for (let i = 0; i < 5; i += 1) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'locked@example.com', password: 'wrong-password' });
        expect(res.status).toBe(401);
        expect(res.body.error.code).toBe('AUTH_INVALID');
      }

      // Locked: correct credentials are rejected with the SAME error —
      // the lock state must not leak which accounts exist.
      const locked = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'locked@example.com', password: PASSWORD });
      expect(locked.status).toBe(401);
      expect(locked.body.error.code).toBe('AUTH_INVALID');
      expect(locked.body.error.message).toBe('Invalid credentials');
    });

    it('clears the lock and allows login again afterwards (auto-recovery path)', async () => {
      await register(app, { email: 'recovery@example.com' });
      for (let i = 0; i < 5; i += 1) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'recovery@example.com', password: 'wrong-password' });
      }
      const locked = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'recovery@example.com', password: PASSWORD });
      expect(locked.status).toBe(401);

      // Simulate lock expiry (temporary lock -> automatic recovery).
      app.get(LoginAttemptGuard).clearAll();

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'recovery@example.com', password: PASSWORD })
        .expect(200);
      expect(res.body.data.accessToken).toBeTypeOf('string');
    });

    it('does not lock a fresh identifier that was never attacked', async () => {
      await register(app, { email: 'fresh@example.com' });
      // Fail against a different identifier.
      for (let i = 0; i < 5; i += 1) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'other@example.com', password: 'wrong-password' });
      }
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'fresh@example.com', password: PASSWORD })
        .expect(200);
      expect(res.body.data.user.email).toBe('fresh@example.com');
    });
  });

  describe('authority isolation', () => {
    async function seedAdmin(email: string): Promise<Session> {
      prisma.adminUsers.push({
        id: '22222222-2222-4222-8222-222222222222',
        email,
        passwordHash: (
          await (requireCjs('../dist/auth/password') as { hashPassword: (p: string) => Promise<string> })
            .hashPassword(PASSWORD)
        ),
        role: 'super_admin',
        status: 'active',
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({ email, password: PASSWORD })
        .expect(200);
      return res.body.data as Session;
    }

    it.each(['technician', 'merchant'])('rejects a %s token on /admin/me', async (role) => {
      const session = await register(app, { email: `${role}@example.com`, role });
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/me')
        .set('Authorization', `Bearer ${session.accessToken}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('rejects an admin access token on the user /me endpoint', async () => {
      const admin = await seedAdmin('admin-iso@example.com');
      const res = await request(app.getHttpServer())
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${admin.accessToken}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('rejects an admin refresh token on the user refresh endpoint', async () => {
      const admin = await seedAdmin('admin-iso2@example.com');
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: admin.refreshToken });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID');
    });

    it('rejects a customer refresh token on the admin refresh endpoint', async () => {
      const session = await register(app, { email: 'customer-iso@example.com' });
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/refresh')
        .send({ refreshToken: session.refreshToken });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID');
    });
  });
});
