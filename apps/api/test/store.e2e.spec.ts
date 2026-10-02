/**
 * End-to-end tests for the public store product read APIs (Phase D):
 *   - GET /products (active-only, paginated, minimal public fields)
 *   - GET /products/:id (active detail; identical 404 for suspended/missing)
 *   - OpenAPI representation (ADR-0003)
 *   - merchant management stays role-scoped (customer/technician blocked)
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

const MERCHANT_A = '11111111-1111-4111-8111-111111111111';
const MERCHANT_B = '22222222-2222-4222-8222-222222222222';
const PRODUCT_ACTIVE_1 = 'aaaaaaaa-0001-4001-8001-000000000001';
const PRODUCT_ACTIVE_2 = 'aaaaaaaa-0002-4002-8002-000000000002';
const PRODUCT_SUSPENDED = 'aaaaaaaa-0003-4003-8003-000000000003';

function seedStore(prisma: FakePrismaClient): void {
  prisma.merchantProfiles.push(
    { id: MERCHANT_A, userId: 'u-merchant-a', businessName: 'متجر الأول', bio: null, logoUrl: null, contactPhone: '+201000000001', locationId: null, verificationStatus: 'verified', createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z') },
    { id: MERCHANT_B, userId: 'u-merchant-b', businessName: null, bio: null, logoUrl: null, contactPhone: null, locationId: null, verificationStatus: 'pending', createdAt: new Date('2026-01-01T00:00:00Z'), updatedAt: new Date('2026-01-01T00:00:00Z') },
  );
  prisma.products.push(
    { id: PRODUCT_ACTIVE_1, merchantId: MERCHANT_A, nameAr: 'فلتر تكييف', slug: 'ac-filter', descriptionAr: 'فلتر قابل للغسل', price: 75, stockQuantity: 4, imageUrl: 'https://cdn.example/ac-filter.png', status: 'active', createdAt: new Date('2026-02-02T00:00:00Z'), updatedAt: new Date('2026-02-02T00:00:00Z') },
    { id: PRODUCT_ACTIVE_2, merchantId: MERCHANT_B, nameAr: 'مضخة مياه', slug: 'water-pump', descriptionAr: null, price: 320, stockQuantity: null, imageUrl: null, status: 'active', createdAt: new Date('2026-02-01T00:00:00Z'), updatedAt: new Date('2026-02-01T00:00:00Z') },
    { id: PRODUCT_SUSPENDED, merchantId: MERCHANT_A, nameAr: 'منتج موقوف', slug: 'suspended', descriptionAr: null, price: 10, stockQuantity: 0, imageUrl: null, status: 'suspended', createdAt: new Date('2026-03-01T00:00:00Z'), updatedAt: new Date('2026-03-01T00:00:00Z') },
  );
}

describe('store public product reads e2e', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;

  beforeAll(async () => {
    const dbUrl = process.env['DATABASE_URL'] ?? '';
    if (/supabase\.com|supabase\.co/i.test(dbUrl)) {
      throw new Error('E2E database safety: a real Supabase URL is configured.');
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
    prisma.merchantProfiles.length = 0;
    prisma.products.length = 0;
    seedStore(prisma);
  });

  describe('GET /products', () => {
    it('lists ACTIVE products only (newest first), publicly', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products').expect(200);
      expect(res.body.data.map((p: { id: string }) => p.id)).toEqual([PRODUCT_ACTIVE_1, PRODUCT_ACTIVE_2]);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1, hasNext: false });
    });

    it('exposes the minimal public read model only', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products').expect(200);
      const first = res.body.data[0];
      expect(first).toMatchObject({
        id: PRODUCT_ACTIVE_1,
        nameAr: 'فلتر تكييف',
        slug: 'ac-filter',
        descriptionAr: 'فلتر قابل للغسل',
        price: 75,
        imageUrl: 'https://cdn.example/ac-filter.png',
        merchant: { businessNameAr: 'متجر الأول' },
      });
      // No internal / merchant-management fields.
      for (const forbidden of ['merchantId', 'stockQuantity', 'status', 'createdAt', 'updatedAt']) {
        expect(first).not.toHaveProperty(forbidden);
      }
    });

    it('reports a null business name truthfully (no fabrication)', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/products/${PRODUCT_ACTIVE_2}`).expect(200);
      expect(res.body.data.merchant).toEqual({ businessNameAr: null });
    });

    it('paginates and rejects values above the server max', async () => {
      const page2 = await request(app.getHttpServer()).get('/api/v1/products').query({ limit: 1, page: 2 }).expect(200);
      expect(page2.body.data.map((p: { id: string }) => p.id)).toEqual([PRODUCT_ACTIVE_2]);
      expect(page2.body.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2, hasNext: false });

      const tooBig = await request(app.getHttpServer()).get('/api/v1/products').query({ limit: 101 });
      expect(tooBig.status).toBe(400);
      expect(tooBig.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /products/:id', () => {
    it('returns an active product detail', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/products/${PRODUCT_ACTIVE_1}`).expect(200);
      expect(res.body.data.id).toBe(PRODUCT_ACTIVE_1);
      expect(res.body.data.merchant.businessNameAr).toBe('متجر الأول');
    });

    it('returns an identical 404 for suspended and missing products', async () => {
      for (const id of [PRODUCT_SUSPENDED, '99999999-9999-4999-8999-999999999999']) {
        const res = await request(app.getHttpServer()).get(`/api/v1/products/${id}`);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
        expect(res.body.error.message).toBe('Product not found');
      }
    });

    it('returns the controlled NOT_FOUND for a non-UUID product id (never 500)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/products/not-a-uuid');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('authorization', () => {
    it('keeps merchant management role-scoped (no token → 401)', async () => {
      const anon = await request(app.getHttpServer()).get('/api/v1/merchant/products');
      expect(anon.status).toBe(401);
      expect(anon.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('openapi representation (ADR-0003)', () => {
    it('derives the store routes and public schemas', async () => {
      const document = SwaggerModule.createDocument(app, {
        openapi: '3.0.3',
        info: { title: 'Al-Khabir API', version: '0.1.0' },
        components: {
          securitySchemes: { bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
          schemas: CONTRACT_SCHEMAS as Record<string, object>,
        },
      });

      const paths = Object.keys(document.paths);
      expect(paths).toContain('/api/v1/products');
      expect(paths).toContain('/api/v1/products/{id}');

      const schemas = Object.keys(document.components?.schemas ?? {});
      for (const name of ['PublicProductDto', 'PublicMerchantRefDto']) {
        expect(schemas).toContain(name);
      }
    });
  });
});
