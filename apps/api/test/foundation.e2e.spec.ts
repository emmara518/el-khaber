/**
 * End-to-end tests for the API foundation (Task 10C):
 *   - request-ID middleware (generation, sanitization, response header)
 *   - PATCH /me (contact-field updates with strict authorization)
 *   - admin auth surface (login/refresh/logout + authority separation)
 *   - OpenAPI document derivation from the real controllers (ADR-0003)
 *   - /health and /ready
 *
 * Bootstraps the compiled NestJS app against the in-memory FakePrisma
 * client exactly like `auth.e2e.spec.ts` (see that file for rationale).
 * The same DB-safety guard applies: a real Supabase URL in the
 * environment must abort the suite.
 */

import { createRequire } from 'node:module';

import { SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../dist/app.module';
import { getConfig } from '../dist/config/app.config';

import { createFakePrisma, type FakePrismaClient } from './fake-prisma';

import type { INestApplication } from '@nestjs/common';

const requireCjs = createRequire(import.meta.url);
const { PrismaService } = requireCjs('../dist/database/prisma.service') as {
  PrismaService: new (...args: unknown[]) => unknown;
};
const { hashPassword } = requireCjs('../dist/auth/password') as {
  hashPassword: (plain: string) => Promise<string>;
};
const { CONTRACT_SCHEMAS } = requireCjs('../dist/common/openapi/contract-schemas') as {
  CONTRACT_SCHEMAS: Record<string, unknown>;
};

const PASSWORD = 'sup3rsecretP4ss';

interface Session {
  accessToken: string;
  refreshToken: string;
}

async function registerUser(
  app: INestApplication,
  body: Record<string, unknown>,
): Promise<Session> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ role: 'customer', password: PASSWORD, ...body })
    .expect(201);
  return res.body.data as Session;
}

describe('api foundation e2e', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;

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

  describe('request ids', () => {
    it('returns an X-Request-Id header on every response', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/u);
    });

    it('echoes a well-formed incoming X-Request-Id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('X-Request-Id', 'e2e-trace-1234567890')
        .expect(200);
      expect(res.headers['x-request-id']).toBe('e2e-trace-1234567890');
    });

    it('replaces unsafe incoming request ids with a generated one', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('X-Request-Id', 'bad id with spaces;drop')
        .expect(200);
      const echoed = res.headers['x-request-id'] as string;
      expect(echoed).not.toBe('bad id with spaces;drop');
      expect(echoed).toMatch(/^[0-9a-f-]{36}$/u);
    });

    it('does not echo the request id inside the error envelope (contract unchanged)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/me').expect(401);
      expect(res.body.error).not.toHaveProperty('requestId');
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('PATCH /me', () => {
    it('updates the email and resets its verification flag', async () => {
      const session = await registerUser(app, { email: 'me1@example.com' });
      const res = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ email: 'me1-new@example.com' })
        .expect(200);
      expect(res.body.data.email).toBe('me1-new@example.com');
      expect(res.body.data.emailVerified).toBe(false);
    });

    it('updates the phone and resets its verification flag', async () => {
      const session = await registerUser(app, { phone: '+201111111111' });
      const res = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ phone: '+201222222222' })
        .expect(200);
      expect(res.body.data.phone).toBe('+201222222222');
      expect(res.body.data.phoneVerified).toBe(false);
    });

    it('rejects an empty payload with VALIDATION_ERROR', async () => {
      const session = await registerUser(app, { email: 'me2@example.com' });
      const res = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('strips forbidden fields: role/status/verification can never be mutated', async () => {
      const session = await registerUser(app, { email: 'me3@example.com' });
      const res = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ email: 'me3-new@example.com', role: 'merchant', status: 'suspended', phoneVerified: true })
        .expect(200);
      expect(res.body.data.role).toBe('customer');
      expect(res.body.data.status).toBe('active');
      expect(res.body.data.phoneVerified).toBe(false);
    });

    it('rejects a phone already used by another account (409 CONFLICT)', async () => {
      await registerUser(app, { phone: '+201333333333' });
      const session = await registerUser(app, { email: 'me4@example.com' });
      const res = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ phone: '+201333333333' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('keeps the same contact channel verified state when value is unchanged', async () => {
      const session = await registerUser(app, { email: 'me5@example.com' });
      const res = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ email: 'me5@example.com' })
        .expect(200);
      expect(res.body.data.email).toBe('me5@example.com');
    });

    it('requires authentication', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/me')
        .send({ email: 'x@example.com' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('admin auth surface', () => {
    async function seedAdmin(email: string): Promise<void> {
      prisma.adminUsers.push({
        id: '11111111-1111-4111-8111-111111111111',
        email,
        passwordHash: await hashPassword(PASSWORD),
        role: 'super_admin',
        status: 'active',
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    it('POST /admin/auth/login issues an admin session', async () => {
      await seedAdmin('admin@khabir.test');
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({ email: 'admin@khabir.test', password: PASSWORD })
        .expect(200);
      expect(res.body.data.accessToken).toBeTypeOf('string');
      expect(res.body.data.refreshToken).toBeTypeOf('string');
    });

    it('POST /admin/auth/login rejects invalid credentials', async () => {
      await seedAdmin('admin2@khabir.test');
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({ email: 'admin2@khabir.test', password: 'wrong-password' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_INVALID');
    });

    it('POST /admin/auth/refresh rotates the admin session', async () => {
      await seedAdmin('admin3@khabir.test');
      const login = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({ email: 'admin3@khabir.test', password: PASSWORD })
        .expect(200);
      const res = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/refresh')
        .send({ refreshToken: login.body.data.refreshToken })
        .expect(200);
      expect(res.body.data.accessToken).toBeTypeOf('string');
      // Replay of the rotated token must fail.
      const replay = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/refresh')
        .send({ refreshToken: login.body.data.refreshToken });
      expect(replay.status).toBe(401);
    });

    it('GET /admin/me returns the admin identity', async () => {
      await seedAdmin('admin4@khabir.test');
      const login = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({ email: 'admin4@khabir.test', password: PASSWORD })
        .expect(200);
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/me')
        .set('Authorization', `Bearer ${login.body.data.accessToken}`)
        .expect(200);
      expect(res.body.data.email).toBe('admin4@khabir.test');
    });

    it('rejects a customer access token on /admin/me (separate authority)', async () => {
      const session = await registerUser(app, { email: 'notadmin@example.com' });
      const res = await request(app.getHttpServer())
        .get('/api/v1/admin/me')
        .set('Authorization', `Bearer ${session.accessToken}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('POST /admin/auth/logout revokes the admin refresh family', async () => {
      await seedAdmin('admin5@khabir.test');
      const login = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .send({ email: 'admin5@khabir.test', password: PASSWORD })
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/admin/auth/logout')
        .send({ refreshToken: login.body.data.refreshToken })
        .expect(204);
      const replay = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/refresh')
        .send({ refreshToken: login.body.data.refreshToken });
      expect(replay.status).toBe(401);
    });
  });

  describe('health and readiness', () => {
    it('GET /health returns process liveness only', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
      expect(res.body.data).toEqual({ status: 'ok', service: 'api' });
    });

    it('GET /ready verifies the database dependency', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/ready').expect(200);
      expect(res.body.data).toEqual({ status: 'ready', checks: { database: 'ok' } });
    });
  });

  describe('openapi contract (ADR-0003)', () => {
    it('derives every implemented route into the document', async () => {
      const document = SwaggerModule.createDocument(app, {
        openapi: '3.0.3',
        info: { title: 'Al-Khabir API', version: '0.1.0' },
        components: {
          securitySchemes: {
            bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
          schemas: CONTRACT_SCHEMAS as Record<string, object>,
        },
      });

      const paths = Object.keys(document.paths).sort();
      const expected = [
        '/api/v1/admin/auth/login',
        '/api/v1/admin/auth/logout',
        '/api/v1/admin/auth/refresh',
        '/api/v1/admin/me',
        '/api/v1/auth/forgot-password',
        '/api/v1/auth/login',
        '/api/v1/auth/logout',
        '/api/v1/auth/refresh',
        '/api/v1/auth/register',
        '/api/v1/auth/reset-password',
        '/api/v1/health',
        '/api/v1/me',
        '/api/v1/ready',
      ];
      expect(paths).toEqual(expected);

      // PATCH /me is represented alongside GET /me.
      expect(Object.keys(document.paths['/api/v1/me'])).toEqual(expect.arrayContaining(['get', 'patch']));

      // Shared contract components are registered.
      const schemas = Object.keys(document.components?.schemas ?? {});
      for (const name of ['AuthSessionDto', 'AuthUserDto', 'MeDto', 'ApiMeta', 'ErrorResponse', 'UpdateMeDto', 'Role', 'ErrorCode']) {
        expect(schemas).toContain(name);
      }

      // The login request schema is derived from the validating zod schema.
      const login = document.paths['/api/v1/auth/login'].post;
      expect(login.requestBody?.content?.['application/json']?.schema).toMatchObject({
        type: 'object',
        properties: expect.objectContaining({ email: expect.anything(), password: expect.anything() }),
      });
    });
  });
});
