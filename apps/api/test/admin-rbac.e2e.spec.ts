/**
 * Admin RBAC matrix (S3).
 *
 * Proves two independent properties:
 *   1. Every route declared with `@AuthKind('admin')` carries explicit
 *      `@AdminRoles(...)` metadata (default-deny guard, no silent allow).
 *   2. The matrix is enforced server-side: support/content/operations admins
 *      cannot perform financial actions, and the permitted workflows are not
 *      blocked (authorized requests proceed to domain validation: 404/409,
 *      never 403).
 */

import 'reflect-metadata';

import { createRequire } from 'node:module';

import { DiscoveryModule, DiscoveryService } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../dist/app.module';
import { getConfig } from '../dist/config/app.config';

import { createFakePrisma, type FakePrismaClient } from './fake-prisma';

import type { INestApplication } from '@nestjs/common';
import type { AdminRole } from '@prisma/client';

const requireCjs = createRequire(import.meta.url);
const { PrismaService } = requireCjs('../dist/database/prisma.service') as {
  PrismaService: new (...args: unknown[]) => unknown;
};
const { hashPassword } = requireCjs('../dist/auth/password') as {
  hashPassword: (plain: string) => Promise<string>;
};
const { AUTH_KIND_METADATA_KEY, ADMIN_ROLES_METADATA_KEY } = requireCjs(
  '../dist/common/decorators',
) as {
  AUTH_KIND_METADATA_KEY: string;
  ADMIN_ROLES_METADATA_KEY: string;
};
const { PATH_METADATA } = requireCjs('@nestjs/common/constants') as {
  PATH_METADATA: string;
};

const PASSWORD = 'sup3rsecretP4ss';
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000099';
const KNOWN_ADMIN_ROLES = new Set([
  'super_admin',
  'operations_admin',
  'content_admin',
  'support_admin',
  'finance_admin',
]);

let adminSeq = 0;

describe('admin RBAC', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;
  let discovery: DiscoveryService;

  beforeAll(async () => {
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

    prisma = createFakePrisma();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, DiscoveryModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(getConfig().globalPrefix);
    await app.init();
    discovery = moduleRef.get(DiscoveryService);
  });

  beforeEach(() => {
    prisma.adminUsers.length = 0;
    prisma.adminRefreshTokens.length = 0;
    prisma.auditLogRows.length = 0;
    adminSeq = 0;
  });

  async function tokenFor(role: AdminRole): Promise<string> {
    adminSeq += 1;
    const email = `rbac-${role}-${adminSeq}@khabir.test`;
    prisma.adminUsers.push({
      id: `00000000-0000-4000-8000-${String(1000 + adminSeq).padStart(12, '0')}`,
      email,
      passwordHash: await hashPassword(PASSWORD),
      role,
      status: 'active',
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return login.body.data.accessToken as string;
  }

  it('every admin route declares explicit AdminRoles metadata', () => {
    const missing: string[] = [];
    const unknown: string[] = [];

    for (const wrapper of discovery.getControllers()) {
      const metatype = wrapper.metatype as { name: string; prototype: object } | undefined;
      if (metatype === undefined) continue;

      const classKind = Reflect.getMetadata(AUTH_KIND_METADATA_KEY, metatype) as unknown;
      for (const name of Object.getOwnPropertyNames(metatype.prototype)) {
        if (name === 'constructor') continue;
        const handler = (metatype.prototype as Record<string, unknown>)[name];
        if (typeof handler !== 'function') continue;
        if (Reflect.getMetadata(PATH_METADATA, handler) === undefined) continue;

        const kind = (Reflect.getMetadata(AUTH_KIND_METADATA_KEY, handler) ?? classKind) as unknown;
        if (kind !== 'admin') continue;

        const roles = Reflect.getMetadata(ADMIN_ROLES_METADATA_KEY, handler) as
          | string[]
          | undefined;
        const route = `${metatype.name}.${name}`;
        if (roles === undefined || roles.length === 0) {
          missing.push(route);
          continue;
        }
        for (const role of roles) {
          if (!KNOWN_ADMIN_ROLES.has(role)) unknown.push(`${route}: ${role}`);
        }
      }
    }

    expect(missing).toEqual([]);
    expect(unknown).toEqual([]);
  });

  it('support_admin cannot approve payments or grant subscriptions', async () => {
    const token = await tokenFor('support_admin');

    const approve = await request(app.getHttpServer())
      .post(`/api/v1/admin/payments/submissions/${UNKNOWN_UUID}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(approve.status).toBe(403);
    expect(approve.body.error.code).toBe('FORBIDDEN');

    const grant = await request(app.getHttpServer())
      .post('/api/v1/admin/subscriptions/grant')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: UNKNOWN_UUID, plan_id: UNKNOWN_UUID });
    expect(grant.status).toBe(403);
  });

  it('operations_admin cannot grant subscriptions or decide payments', async () => {
    const token = await tokenFor('operations_admin');

    const grant = await request(app.getHttpServer())
      .post('/api/v1/admin/subscriptions/grant')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: UNKNOWN_UUID, plan_id: UNKNOWN_UUID });
    expect(grant.status).toBe(403);

    const approve = await request(app.getHttpServer())
      .post(`/api/v1/admin/payments/submissions/${UNKNOWN_UUID}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(approve.status).toBe(403);
  });

  it('content_admin cannot perform financial actions', async () => {
    const token = await tokenFor('content_admin');
    const approve = await request(app.getHttpServer())
      .post(`/api/v1/admin/payments/submissions/${UNKNOWN_UUID}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(approve.status).toBe(403);
  });

  it('operations_admin keeps the documented operational permissions', async () => {
    const token = await tokenFor('operations_admin');

    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const verification = await request(app.getHttpServer())
      .post(`/api/v1/admin/technicians/${UNKNOWN_UUID}/verification`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'verified', reason: 'documented review' });
    expect(verification.status).toBe(404);
    expect(verification.status).not.toBe(403);
  });

  it('support_admin is read-limited: can list users, cannot moderate reviews', async () => {
    const token = await tokenFor('support_admin');

    await request(app.getHttpServer())
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const remove = await request(app.getHttpServer())
      .post(`/api/v1/admin/reviews/${UNKNOWN_UUID}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'policy violation' });
    expect(remove.status).toBe(403);
  });

  it('content_admin can moderate reviews but cannot see payment proofs', async () => {
    const token = await tokenFor('content_admin');

    const remove = await request(app.getHttpServer())
      .post(`/api/v1/admin/reviews/${UNKNOWN_UUID}/remove`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'policy violation' });
    expect(remove.status).toBe(404);

    const proof = await request(app.getHttpServer())
      .get(`/api/v1/admin/payments/submissions/${UNKNOWN_UUID}/proof-url`)
      .set('Authorization', `Bearer ${token}`);
    expect(proof.status).toBe(403);
  });

  it('super_admin authorizes financial decisions (domain validation follows)', async () => {
    const token = await tokenFor('super_admin');

    const approve = await request(app.getHttpServer())
      .post(`/api/v1/admin/payments/submissions/${UNKNOWN_UUID}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(approve.status).toBe(404);

    const grant = await request(app.getHttpServer())
      .post('/api/v1/admin/subscriptions/grant')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: UNKNOWN_UUID, plan_id: UNKNOWN_UUID });
    expect(grant.status).toBe(404);
  });
});
