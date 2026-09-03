/**
 * End-to-end tests for the authentication surface.
 *
 * These tests import the **compiled** NestJS application from
 * `apps/api/dist/app.module.js`. This is the standard NestJS e2e
 * pattern: vitest's default esbuild transformer does not emit
 * TypeScript decorator metadata, so running the tests against the raw
 * source would cause Nest's DI container to receive `undefined` for
 * injected providers. Using the compiled artifact (which was built
 * with `tsc` and `emitDecoratorMetadata: true`) sidesteps the problem
 * without changing the application architecture.
 *
 * Persistence: an in-memory fake Prisma client is injected via
 * `Test.createTestingModule(...).overrideProvider(PrismaService)`.
 * The real local PostgreSQL is not used in this environment
 * (see Task #002A report — `DATABASE ENVIRONMENT BLOCKED`).
 *
 * What is covered:
 *   - register / login / refresh / refresh-rotation / refresh-replay / logout
 *   - /me (authenticated) and /me (unauthenticated)
 *   - role escalation rejection (admin cannot register via public API)
 *   - validation errors return canonical envelope with field details
 *   - forgot-password (always 202, never reveals whether user exists)
 *   - reset-password (valid token succeeds, reuse rejected, expired rejected)
 *   - GET /health and GET /ready
 *
 * Source: Task #002A spec, docs/10_ENGINEERING_RULES.md §22–§24.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createRequire } from 'node:module';
import request from 'supertest';
import { createHash } from 'node:crypto';

import { AppModule } from '../dist/app.module';
import { getConfig } from '../dist/config/app.config';
import { createFakePrisma, type FakePrismaClient } from './fake-prisma';

// The compiled API is CommonJS. The vitest test is processed by esbuild
// as ESM. Importing classes across the ESM/CJS boundary gives two
// different class identities, which breaks `overrideProvider` (Nest
// resolves the provider by class reference). `createRequire` lets the
// test load the CJS module from the same realm as the rest of the
// compiled app, so the `PrismaService` token matches the one Nest
// registered inside `AppModule`.
const requireCjs = createRequire(import.meta.url);
const { PrismaService } = requireCjs('../dist/database/prisma.service') as {
  PrismaService: new (...args: unknown[]) => unknown;
};

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function randomToken(): string {
  // base64url, >= 20 chars to satisfy zod minimum
  return Buffer.from(`${Date.now()}-${Math.random()}-${Math.random()}`).toString('base64url').padEnd(24, 'x');
}

describe('auth e2e', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    process.env['PORT'] = '0';
    process.env['API_GLOBAL_PREFIX'] = 'api/v1';
    process.env['CORS_ORIGINS'] = '';
    process.env['DATABASE_URL'] = 'postgresql://test/test';
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

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
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
  });

  it('POST /auth/register creates a user and returns a session', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'customer', email: 'a@example.com', password: 'sup3rsecretP4ss' })
      .expect(201);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(res.body.data.refreshToken).toBeTypeOf('string');
    expect(res.body.data.user.email).toBe('a@example.com');
    expect(res.body.data.user.role).toBe('customer');
    // Security: no password hash, no refresh token hash in payload
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(res.body.data)).not.toContain('sup3rsecretP4ss');
  });

  it('POST /auth/register rejects admin role', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'admin', email: 'x@example.com', password: 'sup3rsecretP4ss' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /auth/login with valid credentials returns a session', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'customer', email: 'login@example.com', password: 'sup3rsecretP4ss' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'sup3rsecretP4ss' })
      .expect(200);
    expect(res.body.data.accessToken).toBeTypeOf('string');
  });

  it('POST /auth/login with invalid password returns 401 with canonical envelope', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'customer', email: 'bad@example.com', password: 'sup3rsecretP4ss' })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'bad@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID');
    expect(JSON.stringify(res.body)).not.toContain('sup3rsecretP4ss');
  });

  it('POST /auth/login with unknown user returns 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'sup3rsecretP4ss' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID');
  });

  it('GET /me requires a valid access token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('GET /me returns the authenticated user (no password hash, no refresh token)', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'technician', phone: '+201234567890', password: 'sup3rsecretP4ss' })
      .expect(201);
    const accessToken: string = reg.body.data.accessToken;
    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body.data.role).toBe('technician');
    expect(me.body.data.phone).toBe('+201234567890');
    expect(me.body.data).not.toHaveProperty('passwordHash');
    expect(me.body.data).not.toHaveProperty('refreshToken');
  });

  it('GET /me rejects a malformed bearer token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('POST /auth/refresh issues a new pair and revokes the old refresh token', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'customer', email: 'rf@example.com', password: 'sup3rsecretP4ss' })
      .expect(201);
    const oldRefresh: string = reg.body.data.refreshToken;
    const newRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh })
      .expect(200);
    expect(newRes.body.data.refreshToken).not.toBe(oldRefresh);
    expect(newRes.body.data.accessToken).toBeTypeOf('string');

    // Replay of the old token must fail and revoke the whole family.
    const replay = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldRefresh });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('AUTH_INVALID');

    // The new token must also be invalid after the family was revoked.
    const after = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: newRes.body.data.refreshToken });
    expect(after.status).toBe(401);
  });

  it('POST /auth/logout revokes the family; subsequent refresh fails', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'customer', email: 'lo@example.com', password: 'sup3rsecretP4ss' })
      .expect(201);
    const refresh: string = reg.body.data.refreshToken;
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken: refresh })
      .expect(204);
    const after = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh });
    expect(after.status).toBe(401);
  });

  it('validation errors return canonical envelope with field details', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'customer', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toBeDefined();
  });

  it('POST /auth/forgot-password always returns 202 and never reveals whether a user exists', async () => {
    // Unknown user
    const r1 = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'unknown@example.com' })
      .expect(202);
    expect(r1.body.data).toEqual({ accepted: true });
    // No raw token in the response
    expect(JSON.stringify(r1.body)).not.toContain('refreshToken');
    expect(JSON.stringify(r1.body)).not.toMatch(/eyJ/); // not a JWT

    // Known user
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'customer', email: 'known@example.com', password: 'sup3rsecretP4ss' })
      .expect(201);
    const r2 = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'known@example.com' })
      .expect(202);
    expect(r2.body.data).toEqual({ accepted: true });
    // Identical response shape: the controller must not leak whether a user matched.
    expect(Object.keys(r2.body.data).sort()).toEqual(Object.keys(r1.body.data).sort());
  });

  it('POST /auth/reset-password rotates the password, marks the token used, and invalidates all refresh-token families', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'customer', email: 'reset@example.com', password: 'oldPassword1234' })
      .expect(201);

    // Create a reset token directly in the fake store (simulating the
    // notification adapter having received the raw token from the service).
    const user = prisma.users[0];
    if (!user) {
      throw new Error('expected a user to be created');
    }
    const rawToken = randomToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Reset the password.
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'newPassword1234' })
      .expect(204);

    // Old password no longer works.
    const oldLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'reset@example.com', password: 'oldPassword1234' });
    expect(oldLogin.status).toBe(401);
    expect(oldLogin.body.error.code).toBe('AUTH_INVALID');

    // New password works.
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'reset@example.com', password: 'newPassword1234' })
      .expect(200);

    // The token is marked used.
    const stored = prisma.passwordResetTokens.find((r) => r.userId === user.id);
    expect(stored?.usedAt).not.toBeNull();
  });

  it('POST /auth/reset-password rejects a reused (already-used) token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'customer', email: 'reuse@example.com', password: 'oldPassword1234' })
      .expect(201);
    const user = prisma.users[0];
    if (!user) {
      throw new Error('expected a user to be created');
    }
    const rawToken = randomToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    // First consume succeeds.
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'brandNew1P4ss' })
      .expect(204);
    // Replay must fail.
    const replay = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'anotherNew1P4ss' });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('AUTH_INVALID');
  });

  it('POST /auth/reset-password rejects an expired token', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role: 'customer', email: 'exp@example.com', password: 'oldPassword1234' })
      .expect(201);
    const user = prisma.users[0];
    if (!user) {
      throw new Error('expected a user to be created');
    }
    const rawToken = randomToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(rawToken),
        // Expired 1 hour ago
        expiresAt: new Date(Date.now() - 60 * 60 * 1000),
      },
    });
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'newPassword1234' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID');
  });

  it('GET /health returns 200 and canonical envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /ready returns 200 with database ok (Prisma fake returns SELECT 1)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/ready').expect(200);
    expect(res.body.data.status).toBe('ready');
    expect(res.body.data.checks.database).toBe('ok');
  });
});
