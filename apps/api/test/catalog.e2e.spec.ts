/**
 * End-to-end tests for catalog + content APIs (Task 10E):
 *   - appliance categories (active-only, public)
 *   - fault guide (published-only boundary, filters, pagination, safety
 *     content passthrough, detail 404 semantics)
 *   - service catalog (active-only, filters, pagination)
 *   - technician discovery (verified-only visibility, documented filters,
 *     deterministic rating sort, bounded results, public-field exposure)
 *   - OpenAPI representation of every new route (ADR-0003)
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

const CAT_WASHING = 'aaaaaaaa-1111-4111-8111-111111111111';
const CAT_FRIDGE = 'aaaaaaaa-2222-4222-8222-222222222222';
const SVC_WASHING = 'bbbbbbbb-1111-4111-8111-111111111111';
const SVC_FRIDGE = 'bbbbbbbb-2222-4222-8222-222222222222';
const FAULT_WASHING = 'cccccccc-1111-4111-8111-111111111111';
const FAULT_FRIDGE = 'cccccccc-2222-4222-8222-222222222222';
const TECH_HIGH_RATING = 'dddddddd-1111-4111-8111-111111111111';
const TECH_LOW_RATING = 'dddddddd-2222-4222-8222-222222222222';

/**
 * Deterministic catalog fixture (Task 10E §26): reference data only —
 * no user identities, reset per test.
 */
function seedCatalog(prisma: FakePrismaClient): void {
  prisma.applianceCategories.push(
    { id: CAT_WASHING, nameAr: 'غسالات', slug: 'washing_machine', iconUrl: null, imageUrl: null, isActive: true, sortOrder: 1 },
    { id: CAT_FRIDGE, nameAr: 'ثلاجات', slug: 'refrigerator', iconUrl: null, imageUrl: null, isActive: true, sortOrder: 2 },
    { id: 'aaaaaaaa-3333-4333-8333-333333333333', nameAr: 'موقوفة', slug: 'inactive_cat', iconUrl: null, imageUrl: null, isActive: false, sortOrder: 3 },
  );

  prisma.services.push(
    { id: SVC_WASHING, applianceCategoryId: CAT_WASHING, nameAr: 'صيانة غسالات', slug: 'washing_repair', descriptionAr: 'خدمة صيانة الغسالات', isActive: true, sortOrder: 1 },
    { id: SVC_FRIDGE, applianceCategoryId: CAT_FRIDGE, nameAr: 'صيانة ثلاجات', slug: 'fridge_repair', descriptionAr: null, isActive: true, sortOrder: 2 },
    { id: 'bbbbbbbb-3333-4333-8333-333333333333', applianceCategoryId: CAT_WASHING, nameAr: 'موقوفة', slug: 'inactive_service', descriptionAr: null, isActive: false, sortOrder: 3 },
  );

  prisma.faults.push(
    {
      id: FAULT_WASHING, applianceCategoryId: CAT_WASHING, nameAr: 'الغسالة لا تدور', slug: 'washer-not-spinning',
      severityLevel: 'medium', summaryAr: 'قد يكون السبب انحشار في المضخة', guidanceAr: 'قد يكون هناك انسداد؛ افصل الكهرباء أولاً',
      safetyNoteAr: 'افصل الكهرباء والمياه قبل أي فحص', whenToCallTechnicianAr: 'اتصل بفني إذا استمرت المشكلة',
      publishStatus: 'published', sortOrder: 1, updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'cccccccc-3333-4333-8333-333333333333', applianceCategoryId: CAT_WASHING, nameAr: 'مسودة عطل', slug: 'draft-fault',
      severityLevel: null, summaryAr: 'مسودة', guidanceAr: 'مسودة', safetyNoteAr: null, whenToCallTechnicianAr: null,
      publishStatus: 'draft', sortOrder: 2, updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: FAULT_FRIDGE, applianceCategoryId: CAT_FRIDGE, nameAr: 'الثلاجة لا تبرد', slug: 'fridge-not-cooling',
      severityLevel: 'high', summaryAr: 'قد يكون kompreسور ضعيف', guidanceAr: 'قد يكون Thermostat معطوباً',
      safetyNoteAr: 'لا تفتح الجهاز بنفسك', whenToCallTechnicianAr: 'اتصل بفني مختص فوراً',
      publishStatus: 'published', sortOrder: 2, updatedAt: new Date('2026-01-02T00:00:00Z'),
    },
    {
      id: 'cccccccc-4444-4444-8444-444444444444', applianceCategoryId: CAT_FRIDGE, nameAr: 'عطل مؤرشف', slug: 'archived-fault',
      severityLevel: null, summaryAr: 'مؤرشف', guidanceAr: 'مؤرشف', safetyNoteAr: null, whenToCallTechnicianAr: null,
      publishStatus: 'archived', sortOrder: 3, updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
  );

  prisma.faultServiceLinks.push(
    { faultId: FAULT_WASHING, serviceId: SVC_WASHING },
    { faultId: FAULT_FRIDGE, serviceId: SVC_FRIDGE },
  );

  prisma.technicianServices.push(
    { technicianId: TECH_HIGH_RATING, serviceId: SVC_WASHING, priceFrom: 150, isActive: true },
    { technicianId: TECH_LOW_RATING, serviceId: SVC_FRIDGE, priceFrom: null, isActive: true },
    { technicianId: 'dddddddd-3333-4333-8333-333333333333', serviceId: SVC_WASHING, priceFrom: null, isActive: false },
  );

  prisma.technicianProfiles.push(
    {
      id: TECH_HIGH_RATING, userId: 'eeeeeeee-1111-4111-8111-111111111111', displayName: 'سامي محمد', bio: 'خبير غسالات',
      avatarUrl: null, verificationStatus: 'verified', availabilityStatus: 'available',
      experienceYears: 8, completedServicesCount: 210, ratingAverage: 4.8, ratingCount: 120,
    },
    {
      id: TECH_LOW_RATING, userId: 'eeeeeeee-2222-4222-8222-222222222222', displayName: 'خالد أحمد', bio: 'فني ثلاجات',
      avatarUrl: null, verificationStatus: 'verified', availabilityStatus: 'busy',
      experienceYears: 3, completedServicesCount: 40, ratingAverage: 3.9, ratingCount: 12,
    },
    {
      id: 'dddddddd-3333-4333-8333-333333333333', userId: 'eeeeeeee-3333-4333-8333-333333333333', displayName: 'غير موثق', bio: null,
      avatarUrl: null, verificationStatus: 'pending', availabilityStatus: 'unavailable',
      experienceYears: 1, completedServicesCount: 0, ratingAverage: 5.0, ratingCount: 1,
    },
    {
      id: 'dddddddd-4444-4444-8444-444444444444', userId: 'eeeeeeee-4444-4444-8444-444444444444', displayName: 'بلا تقييم', bio: null,
      avatarUrl: null, verificationStatus: 'verified', availabilityStatus: 'available',
      experienceYears: 2, completedServicesCount: 5, ratingAverage: null, ratingCount: 0,
    },
  );
  // The unrated technician offers one active service — discovery lists
  // verified technicians who offer at least one active service.
  prisma.technicianServices.push({
    technicianId: 'dddddddd-4444-4444-8444-444444444444', serviceId: SVC_WASHING, priceFrom: null, isActive: true,
  });
}

describe('catalog + content e2e', () => {
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
    prisma.applianceCategories.length = 0;
    prisma.faults.length = 0;
    prisma.services.length = 0;
    prisma.faultServiceLinks.length = 0;
    prisma.technicianServices.length = 0;
    prisma.technicianProfiles.length = 0;
    seedCatalog(prisma);
  });

  describe('GET /appliance-categories', () => {
    it('returns active categories only, sorted, publicly', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/appliance-categories').expect(200);
      expect(res.body.data.map((c: { slug: string }) => c.slug)).toEqual(['washing_machine', 'refrigerator']);
      expect(res.body.data[0]).toMatchObject({ id: CAT_WASHING, nameAr: 'غسالات' });
    });
  });

  describe('GET /faults', () => {
    it('lists published faults only (draft/archived hidden)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/faults').expect(200);
      expect(res.body.data.map((f: { slug: string }) => f.slug)).toEqual(['washer-not-spinning', 'fridge-not-cooling']);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1, hasNext: false });
    });

    it('filters by appliance_category_id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/faults')
        .query({ appliance_category_id: CAT_FRIDGE })
        .expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].slug).toBe('fridge-not-cooling');
    });

    it('supports the documented q filter over name and summary', async () => {
      const byName = await request(app.getHttpServer()).get('/api/v1/faults').query({ q: 'لا تدور' }).expect(200);
      expect(byName.body.data).toHaveLength(1);
      expect(byName.body.data[0].slug).toBe('washer-not-spinning');
      const bySummary = await request(app.getHttpServer())
        .get('/api/v1/faults')
        .query({ q: 'انحشار' })
        .expect(200);
      expect(bySummary.body.data).toHaveLength(1);
      expect(bySummary.body.data[0].slug).toBe('washer-not-spinning');
      const none = await request(app.getHttpServer()).get('/api/v1/faults').query({ q: 'مفتاح' }).expect(200);
      expect(none.body.data).toEqual([]);
      expect(none.body.meta.total).toBe(0);
    });

    it('paginates with bounded limit and rejects values above the server max', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/faults').query({ limit: 1, page: 2 }).expect(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].slug).toBe('fridge-not-cooling');
      expect(res.body.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2, hasNext: false });

      const tooBig = await request(app.getHttpServer()).get('/api/v1/faults').query({ limit: 101 });
      expect(tooBig.status).toBe(400);
      expect(tooBig.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects malformed filters deterministically', async () => {
      const bad = await request(app.getHttpServer()).get('/api/v1/faults').query({ appliance_category_id: 'not-a-uuid' });
      expect(bad.status).toBe(400);
      expect(bad.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /faults/:id', () => {
    it('returns full published content including safety guidance (verbatim passthrough)', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/faults/${FAULT_WASHING}`).expect(200);
      expect(res.body.data).toMatchObject({
        id: FAULT_WASHING,
        summaryAr: 'قد يكون السبب انحشار في المضخة',
        guidanceAr: 'قد يكون هناك انسداد؛ افصل الكهرباء أولاً',
        safetyNoteAr: 'افصل الكهرباء والمياه قبل أي فحص',
        whenToCallTechnicianAr: 'اتصل بفني إذا استمرت المشكلة',
      });
      // No moderation state exposed.
      expect(res.body.data).not.toHaveProperty('publishStatus');
      expect(res.body.data).not.toHaveProperty('isActive');
    });

    it('returns identical 404 for missing, draft, and archived content', async () => {
      for (const id of ['99999999-9999-4999-8999-999999999999', 'cccccccc-3333-4333-8333-333333333333', 'cccccccc-4444-4444-8444-444444444444']) {
        const res = await request(app.getHttpServer()).get(`/api/v1/faults/${id}`);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
        expect(res.body.error.message).toBe('Fault not found');
      }
    });
  });

  describe('GET /services', () => {
    it('lists active services only with category filter and pagination', async () => {
      const all = await request(app.getHttpServer()).get('/api/v1/services').expect(200);
      expect(all.body.data.map((s: { slug: string }) => s.slug)).toEqual(['washing_repair', 'fridge_repair']);
      expect(all.body.meta.total).toBe(2);

      const byCategory = await request(app.getHttpServer())
        .get('/api/v1/services')
        .query({ appliance_category_id: CAT_FRIDGE })
        .expect(200);
      expect(byCategory.body.data).toHaveLength(1);
      expect(byCategory.body.data[0].slug).toBe('fridge_repair');

      const byQ = await request(app.getHttpServer()).get('/api/v1/services').query({ q: 'غسالات' }).expect(200);
      expect(byQ.body.data).toHaveLength(1);
      expect(byQ.body.data[0].slug).toBe('washing_repair');
    });
  });

  describe('GET /technicians', () => {
    it('exposes verified technicians only, sorted by the documented rating signal', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/technicians').expect(200);
      const ids = res.body.data.map((t: { id: string }) => t.id);
      // rating 4.8 first, then 3.9, then unrated (nulls last, stable id tiebreak)
      expect(ids).toEqual([TECH_HIGH_RATING, TECH_LOW_RATING, 'dddddddd-4444-4444-8444-444444444444']);
      expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 3, totalPages: 1, hasNext: false });
    });

    it('exposes public fields only (no user ids, no pricing, no moderation internals)', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/technicians').expect(200);
      const first = res.body.data[0];
      expect(first).not.toHaveProperty('userId');
      expect(first).not.toHaveProperty('priceFrom');
      expect(first).toMatchObject({
        id: TECH_HIGH_RATING,
        displayName: 'سامي محمد',
        verificationStatus: 'verified',
        availabilityStatus: 'available',
        ratingAverage: 4.8,
        services: [{ service: { slug: 'washing_repair' } }],
      });
    });

    it('filters by appliance_category_id, service_id, and fault_id (fault→service→technician)', async () => {
      const byCategory = await request(app.getHttpServer())
        .get('/api/v1/technicians')
        .query({ appliance_category_id: CAT_WASHING })
        .expect(200);
      expect(byCategory.body.data.map((t: { id: string }) => t.id)).toEqual([TECH_HIGH_RATING, 'dddddddd-4444-4444-8444-444444444444']);

      const byService = await request(app.getHttpServer())
        .get('/api/v1/technicians')
        .query({ service_id: SVC_FRIDGE })
        .expect(200);
      expect(byService.body.data.map((t: { id: string }) => t.id)).toEqual([TECH_LOW_RATING]);

      const byFault = await request(app.getHttpServer())
        .get('/api/v1/technicians')
        .query({ fault_id: FAULT_FRIDGE })
        .expect(200);
      expect(byFault.body.data.map((t: { id: string }) => t.id)).toEqual([TECH_LOW_RATING]);
    });

    it('filters by rating_min and availability, and combines filters', async () => {
      const byRating = await request(app.getHttpServer())
        .get('/api/v1/technicians')
        .query({ rating_min: 4 })
        .expect(200);
      expect(byRating.body.data.map((t: { id: string }) => t.id)).toEqual([TECH_HIGH_RATING]);

      const byAvailability = await request(app.getHttpServer())
        .get('/api/v1/technicians')
        .query({ availability: 'busy' })
        .expect(200);
      expect(byAvailability.body.data.map((t: { id: string }) => t.id)).toEqual([TECH_LOW_RATING]);

      const combined = await request(app.getHttpServer())
        .get('/api/v1/technicians')
        .query({ appliance_category_id: CAT_WASHING, availability: 'available', rating_min: 4, q: 'سامي' })
        .expect(200);
      expect(combined.body.data.map((t: { id: string }) => t.id)).toEqual([TECH_HIGH_RATING]);

      const empty = await request(app.getHttpServer())
        .get('/api/v1/technicians')
        .query({ availability: 'unavailable' })
        .expect(200);
      expect(empty.body.data).toEqual([]);
      expect(empty.body.meta.total).toBe(0);
    });

    it('paginates with deterministic ordering across pages', async () => {
      const page1 = await request(app.getHttpServer()).get('/api/v1/technicians').query({ limit: 2, page: 1 }).expect(200);
      const page2 = await request(app.getHttpServer()).get('/api/v1/technicians').query({ limit: 2, page: 2 }).expect(200);
      expect(page1.body.data).toHaveLength(2);
      expect(page1.body.meta.hasNext).toBe(true);
      expect(page2.body.data).toHaveLength(1);
      expect(page2.body.meta).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2, hasNext: false });
    });

    it('returns an identical 404 for missing and non-public technicians on detail', async () => {
      const ok = await request(app.getHttpServer()).get(`/api/v1/technicians/${TECH_HIGH_RATING}`).expect(200);
      expect(ok.body.data.id).toBe(TECH_HIGH_RATING);

      for (const id of ['99999999-9999-4999-8999-999999999999', 'dddddddd-3333-4333-8333-333333333333']) {
        const res = await request(app.getHttpServer()).get(`/api/v1/technicians/${id}`);
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
        expect(res.body.error.message).toBe('Technician not found');
      }
    });
  });

  describe('openapi representation (ADR-0003)', () => {
    it('derives every catalog route into the document', async () => {
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
        '/api/v1/appliance-categories',
        '/api/v1/faults',
        '/api/v1/faults/{id}',
        '/api/v1/services',
        '/api/v1/technicians',
        '/api/v1/technicians/{id}',
      ]) {
        expect(paths).toContain(expected);
      }

      const schemas = Object.keys(document.components?.schemas ?? {});
      for (const name of ['ApplianceCategoryDto', 'FaultSummaryDto', 'FaultDto', 'ServiceDto', 'TechnicianPublicDto']) {
        expect(schemas).toContain(name);
      }

      // Documented query filters are represented on the discovery list.
      const techGet = document.paths['/api/v1/technicians'].get;
      const paramNames = (techGet.parameters ?? []).map((p: { name: string }) => p.name);
      for (const name of ['q', 'appliance_category_id', 'service_id', 'fault_id', 'rating_min', 'availability', 'sort', 'page', 'limit']) {
        expect(paramNames).toContain(name);
      }
    });
  });
});
