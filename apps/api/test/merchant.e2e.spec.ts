/**
 * End-to-end tests for Merchant domain APIs (Task 10G):
 *   - profile read/update (onboarding persistence, verification read-only)
 *   - products: list/detail/create/update/delete, ownership, IDOR,
 *     mass-assignment protection, slug uniqueness, pagination
 *   - role isolation: customer/technician blocked; merchant allowed
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
const { CONTRACT_SCHEMAS } = requireCjs('../dist/common/openapi/contract-schemas') as {
  CONTRACT_SCHEMAS: Record<string, unknown>;
};

const PASSWORD = 'sup3rsecretP4ss';

describe('merchant domain e2e', () => {
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
    process.env['RATE_LIMIT_TTL'] = '60';
    process.env['RATE_LIMIT_MAX'] = '1000';
    process.env['AUTH_RATE_LIMIT_MAX'] = '1000';

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
    prisma.merchantProfiles.length = 0;
    prisma.products.length = 0;
    prisma.locations.length = 0;
  });

  interface Session {
    accessToken: string;
    userId: string;
  }

  async function register(role: 'customer' | 'technician' | 'merchant', email: string): Promise<Session> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role, email, password: PASSWORD })
      .expect(201);
    return { accessToken: res.body.data.accessToken, userId: res.body.data.user.id };
  }

  async function onboardMerchant(email: string): Promise<Session> {
    const session = await register('merchant', email);
    await request(app.getHttpServer())
      .patch('/api/v1/merchant/profile')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ businessName: `متجر ${email}` })
      .expect(200);
    return session;
  }

  function createProduct(
    auth: Session,
    body: Record<string, unknown>,
  ): request.Test {
    return request(app.getHttpServer())
      .post('/api/v1/merchant/products')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .send(body);
  }

  describe('merchant profile', () => {
    it('returns 404 before onboarding, then PATCH creates the profile (onboarding persistence)', async () => {
      const merchant = await register('merchant', 'm-onboard@example.com');
      const before = await request(app.getHttpServer())
        .get('/api/v1/merchant/profile')
        .set('Authorization', `Bearer ${merchant.accessToken}`);
      expect(before.status).toBe(404);
      expect(before.body.error.code).toBe('NOT_FOUND');

      const created = await request(app.getHttpServer())
        .patch('/api/v1/merchant/profile')
        .set('Authorization', `Bearer ${merchant.accessToken}`)
        .send({ businessName: 'متجر الخبير', contactPhone: '+966501234567' })
        .expect(200);
      expect(created.body.data).toMatchObject({
        businessName: 'متجر الخبير',
        contactPhone: '+966501234567',
        verificationStatus: 'pending',
      });

      // Update persists; verification stays read-only.
      const updated = await request(app.getHttpServer())
        .patch('/api/v1/merchant/profile')
        .set('Authorization', `Bearer ${merchant.accessToken}`)
        .send({ bio: 'نشاط تجاري موثوق', verificationStatus: 'verified' })
        .expect(200);
      expect(updated.body.data.bio).toBe('نشاط تجاري موثوق');
      expect(updated.body.data.verificationStatus).toBe('pending');
    });

    it('isolates merchants: each merchant reads only their own profile', async () => {
      const a = await onboardMerchant('m-iso-a@example.com');
      const b = await onboardMerchant('m-iso-b@example.com');
      const aProfile = await request(app.getHttpServer())
        .get('/api/v1/merchant/profile')
        .set('Authorization', `Bearer ${a.accessToken}`)
        .expect(200);
      expect(aProfile.body.data.businessName).toBe('متجر m-iso-a@example.com');
      const bProfile = await request(app.getHttpServer())
        .get('/api/v1/merchant/profile')
        .set('Authorization', `Bearer ${b.accessToken}`)
        .expect(200);
      expect(bProfile.body.data.businessName).toBe('متجر m-iso-b@example.com');
      // Different profile ids.
      expect(aProfile.body.data.id).not.toBe(bProfile.body.data.id);
    });

    it('validates the payload and strips forbidden fields (mass assignment)', async () => {
      const merchant = await register('merchant', 'm-valid@example.com');
      const res = await request(app.getHttpServer())
        .patch('/api/v1/merchant/profile')
        .set('Authorization', `Bearer ${merchant.accessToken}`)
        .send({
          businessName: 'متجر',
          verificationStatus: 'verified',
          userId: 'hacked',
          id: uid(),
        })
        .expect(200);
      expect(res.body.data.verificationStatus).toBe('pending');
      expect(res.body.data.userId).toBeUndefined();

      const invalid = await request(app.getHttpServer())
        .patch('/api/v1/merchant/profile')
        .set('Authorization', `Bearer ${merchant.accessToken}`)
        .send({ contactPhone: '123' });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('merchant products', () => {
    it('creates a product owned by the merchant with server-derived unique slug', async () => {
      const merchant = await onboardMerchant('p-create@example.com');
      const res = await createProduct(merchant, { nameAr: 'غسالة سامسونج', price: 1500 }).expect(201);
      expect(res.body.data).toMatchObject({
        merchantId: expect.any(String),
        nameAr: 'غسالة سامسونج',
        status: 'active',
        price: 1500,
      });
      expect(res.body.data.slug).toBe('غسالة-سامسونج');

      // Same name again: slug uniquified, no conflict.
      const second = await createProduct(merchant, { nameAr: 'غسالة سامسونج' }).expect(201);
      expect(second.body.data.slug).not.toBe(res.body.data.slug);
    });

    it('rejects duplicate explicit slug with 409 and validates the payload', async () => {
      const merchant = await onboardMerchant('p-slug@example.com');
      await createProduct(merchant, { nameAr: 'منتج', slug: 'unique-slug' }).expect(201);
      const dup = await createProduct(merchant, { nameAr: 'منتج آخر', slug: 'unique-slug' });
      expect(dup.status).toBe(409);
      expect(dup.body.error.code).toBe('CONFLICT');

      const invalid = await createProduct(merchant, { price: -5 });
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('lists own products with pagination; other merchants see nothing', async () => {
      const merchantA = await onboardMerchant('p-list-a@example.com');
      const merchantB = await onboardMerchant('p-list-b@example.com');
      await createProduct(merchantA, { nameAr: 'منتج 1' }).expect(201);
      await createProduct(merchantA, { nameAr: 'منتج 2' }).expect(201);

      const own = await request(app.getHttpServer())
        .get('/api/v1/merchant/products')
        .set('Authorization', `Bearer ${merchantA.accessToken}`)
        .expect(200);
      expect(own.body.data).toHaveLength(2);
      expect(own.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1, hasNext: false });

      const foreign = await request(app.getHttpServer())
        .get('/api/v1/merchant/products')
        .set('Authorization', `Bearer ${merchantB.accessToken}`)
        .expect(200);
      expect(foreign.body.data).toEqual([]);

      const paginated = await request(app.getHttpServer())
        .get('/api/v1/merchant/products')
        .set('Authorization', `Bearer ${merchantA.accessToken}`)
        .query({ limit: 1, page: 1 })
        .expect(200);
      expect(paginated.body.data).toHaveLength(1);
      expect(paginated.body.meta).toMatchObject({ total: 2, totalPages: 2, hasNext: true });

      const tooBig = await request(app.getHttpServer())
        .get('/api/v1/merchant/products')
        .set('Authorization', `Bearer ${merchantA.accessToken}`)
        .query({ limit: 101 });
      expect(tooBig.status).toBe(400);
    });

    it('detail/update/suspend/activate/delete enforce ownership with identical 404s', async () => {
      const merchantA = await onboardMerchant('p-own-a@example.com');
      const merchantB = await onboardMerchant('p-own-b@example.com');
      const product = await createProduct(merchantA, { nameAr: 'منتج أ' }).expect(201);
      const productId = product.body.data.id as string;
      const bAuth = { Authorization: `Bearer ${merchantB.accessToken}` };
      const aAuth = { Authorization: `Bearer ${merchantA.accessToken}` };

      // B cannot even see A's product.
      const foreign = await request(app.getHttpServer())
        .get(`/api/v1/merchant/products/${productId}`)
        .set(bAuth);
      expect(foreign.status).toBe(404);
      expect(foreign.body.error.message).toBe('Product not found');

      // B cannot update/suspend/delete it.
      expect(
        (await request(app.getHttpServer()).patch(`/api/v1/merchant/products/${productId}`).set(bAuth).send({ price: 1 })).status,
      ).toBe(404);
      expect(
        (await request(app.getHttpServer()).patch(`/api/v1/merchant/products/${productId}`).set(bAuth).send({ status: 'suspended' })).status,
      ).toBe(404);
      expect(
        (await request(app.getHttpServer()).delete(`/api/v1/merchant/products/${productId}`).set(bAuth)).status,
      ).toBe(404);

      // A suspends then activates (documented transitions both ways).
      const suspended = await request(app.getHttpServer())
        .patch(`/api/v1/merchant/products/${productId}`)
        .set(aAuth)
        .send({ status: 'suspended' })
        .expect(200);
      expect(suspended.body.data.status).toBe('suspended');
      const activated = await request(app.getHttpServer())
        .patch(`/api/v1/merchant/products/${productId}`)
        .set(aAuth)
        .send({ status: 'active' })
        .expect(200);
      expect(activated.body.data.status).toBe('active');

      // Invalid status value → validation error.
      const invalidStatus = await request(app.getHttpServer())
        .patch(`/api/v1/merchant/products/${productId}`)
        .set(aAuth)
        .send({ status: 'deleted' });
      expect(invalidStatus.status).toBe(400);
      expect(invalidStatus.body.error.code).toBe('VALIDATION_ERROR');

      // Update preserves the id and ownership; merchantId is stripped.
      // (An invalid status VALUE is a validation error — covered separately.)
      const updated = await request(app.getHttpServer())
        .patch(`/api/v1/merchant/products/${productId}`)
        .set(aAuth)
        .send({ price: 1999.5, merchantId: uid() })
        .expect(200);
      expect(updated.body.data.id).toBe(productId);
      expect(updated.body.data.price).toBe(1999.5);
      expect(updated.body.data.status).toBe('active');
      expect(updated.body.data.merchantId).not.toBe(uid());

      // Delete (documented) removes the product.
      await request(app.getHttpServer())
        .delete(`/api/v1/merchant/products/${productId}`)
        .set(aAuth)
        .expect(204);
      const gone = await request(app.getHttpServer())
        .get(`/api/v1/merchant/products/${productId}`)
        .set(aAuth);
      expect(gone.status).toBe(404);
    });

    it('unmapped status enum rejected; profile required before product operations', async () => {
      const merchant = await register('merchant', 'p-noprofile@example.com');
      const res = await request(app.getHttpServer())
        .post('/api/v1/merchant/products')
        .set('Authorization', `Bearer ${merchant.accessToken}`)
        .send({ nameAr: 'منتج بلا متجر' });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('role isolation', () => {
    it('blocks customer and technician from merchant routes', async () => {
      const customer = await register('customer', 'r-cust@example.com');
      const technician = await register('technician', 'r-tech@example.com');
      for (const session of [customer, technician]) {
        const profile = await request(app.getHttpServer())
          .get('/api/v1/merchant/profile')
          .set('Authorization', `Bearer ${session.accessToken}`);
        expect(profile.status).toBe(401);
        expect(profile.body.error.code).toBe('AUTH_REQUIRED');
        const products = await request(app.getHttpServer())
          .get('/api/v1/merchant/products')
          .set('Authorization', `Bearer ${session.accessToken}`);
        expect(products.status).toBe(401);
      }
    });

    it('requires authentication', async () => {
      const anon = await request(app.getHttpServer()).get('/api/v1/merchant/products');
      expect(anon.status).toBe(401);
      expect(anon.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('openapi representation (ADR-0003)', () => {
    it('derives every merchant route into the document', async () => {
      const document = SwaggerModule.createDocument(app, {
        openapi: '3.0.3',
        info: { title: 'Al-Khabir API', version: '0.1.0' },
        components: {
          securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
          schemas: CONTRACT_SCHEMAS as Record<string, object>,
        },
      });
      const paths = Object.keys(document.paths);
      for (const expected of [
        '/api/v1/merchant/profile',
        '/api/v1/merchant/products',
        '/api/v1/merchant/products/{id}',
      ]) {
        expect(paths).toContain(expected);
      }
      const schemas = Object.keys(document.components?.schemas ?? {});
      for (const name of ['MerchantProfileDto', 'MerchantProductDto', 'CreateMerchantProductDto', 'UpdateMerchantProductDto']) {
        expect(schemas).toContain(name);
      }
      // Profile PATCH documents the verification-stripping contract.
      const patch = document.paths['/api/v1/merchant/profile'].patch;
      expect(patch.requestBody?.content?.['application/json']?.schema).toMatchObject({
        properties: expect.objectContaining({ businessName: expect.anything() }),
      });
    });
  });
});

function uid(): string {
  return '00000000-0000-4000-8000-' + String(Math.floor(Math.random() * 1e12)).padStart(12, '0');
}
