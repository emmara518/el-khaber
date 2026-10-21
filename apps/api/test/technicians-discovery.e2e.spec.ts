/**
 * End-to-end tests for server-side technician discovery (WP-Discovery):
 *   - text search, service/fault/appliance filters, decimal rating_min,
 *     availability, and service-area label matching — all server-side
 *   - pagination validity + meta + deterministic ordering
 *   - verified-only visibility, identical 404s, no private data leaks
 *   - areasAr exposed on the public DTO (labels only, no coordinates)
 *
 * Runs against the in-memory FakePrismaClient (same harness as the
 * other e2e suites). No network, no credentials, no production systems.
 */

import { createRequire } from 'node:module';

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

const CAT_WASHING = 'aaaaaaaa-1111-4111-8111-111111111111';
const CAT_FRIDGE = 'aaaaaaaa-2222-4222-8222-222222222222';
const SVC_WASHING = 'bbbbbbbb-1111-4111-8111-111111111111';
const SVC_FRIDGE = 'bbbbbbbb-2222-4222-8222-222222222222';
const FAULT_WASHING = 'cccccccc-1111-4111-8111-111111111111';
const TECH_CAIRO = 'dddddddd-1111-4111-8111-111111111111';
const TECH_ALEX = 'dddddddd-2222-4222-8222-222222222222';
const TECH_UNVERIFIED = 'dddddddd-3333-4333-8333-333333333333';

function seedDiscovery(prisma: FakePrismaClient): void {
  prisma.applianceCategories.push(
    {
      id: CAT_WASHING,
      nameAr: 'غسالات',
      slug: 'washing_machine',
      iconUrl: null,
      imageUrl: null,
      isActive: true,
      sortOrder: 1,
    },
    {
      id: CAT_FRIDGE,
      nameAr: 'ثلاجات',
      slug: 'refrigerator',
      iconUrl: null,
      imageUrl: null,
      isActive: true,
      sortOrder: 2,
    },
  );
  prisma.services.push(
    {
      id: SVC_WASHING,
      applianceCategoryId: CAT_WASHING,
      nameAr: 'صيانة غسالات',
      slug: 'washing-repair',
      descriptionAr: null,
      isActive: true,
      sortOrder: 1,
    },
    {
      id: SVC_FRIDGE,
      applianceCategoryId: CAT_FRIDGE,
      nameAr: 'صيانة ثلاجات',
      slug: 'fridge-repair',
      descriptionAr: null,
      isActive: true,
      sortOrder: 1,
    },
  );
  prisma.faults.push({
    id: FAULT_WASHING,
    applianceCategoryId: CAT_WASHING,
    nameAr: 'الغسالة لا تدور',
    slug: 'washer-not-spinning',
    severityLevel: null,
    summaryAr: 'ملخص',
    guidanceAr: 'إرشاد',
    safetyNoteAr: null,
    whenToCallTechnicianAr: null,
    publishStatus: 'published',
    sortOrder: 1,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });
  prisma.faultServiceLinks.push({ faultId: FAULT_WASHING, serviceId: SVC_WASHING });
  prisma.technicianServices.push(
    { technicianId: TECH_CAIRO, serviceId: SVC_WASHING, priceFrom: null, isActive: true },
    { technicianId: TECH_ALEX, serviceId: SVC_FRIDGE, priceFrom: null, isActive: true },
  );
  prisma.technicianProfiles.push(
    {
      id: TECH_CAIRO,
      userId: 'eeeeeeee-1111-4111-8111-111111111111',
      displayName: 'سامي القاهرة',
      bio: 'خبير غسالات',
      avatarUrl: null,
      verificationStatus: 'verified',
      availabilityStatus: 'available',
      experienceYears: 8,
      completedServicesCount: 100,
      ratingAverage: 4.7,
      ratingCount: 50,
    },
    {
      id: TECH_ALEX,
      userId: 'eeeeeeee-2222-4222-8222-222222222222',
      displayName: 'فني الإسكندرية',
      bio: 'متخصص تبريد',
      avatarUrl: null,
      verificationStatus: 'verified',
      availabilityStatus: 'unavailable',
      experienceYears: 4,
      completedServicesCount: 30,
      ratingAverage: 4.9,
      ratingCount: 10,
    },
    {
      id: TECH_UNVERIFIED,
      userId: 'eeeeeeee-3333-4333-8333-333333333333',
      displayName: 'غير موثق',
      bio: null,
      avatarUrl: null,
      verificationStatus: 'pending',
      availabilityStatus: 'available',
      experienceYears: 1,
      completedServicesCount: 0,
      ratingAverage: 5.0,
      ratingCount: 1,
    },
  );
  const now = new Date();
  prisma.areaRows.push(
    {
      id: 'area-1',
      technicianId: TECH_CAIRO,
      labelAr: 'القاهرة – مدينة نصر',
      latitude: null,
      longitude: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'area-2',
      technicianId: TECH_ALEX,
      labelAr: 'الإسكندرية – سموحة',
      latitude: null,
      longitude: null,
      createdAt: now,
      updatedAt: now,
    },
  );
}

describe('technician discovery e2e (WP-Discovery)', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;

  beforeAll(async () => {
    const dbUrl = process.env['DATABASE_URL'] ?? '';
    if (/supabase\.com|supabase\.co/i.test(dbUrl)) {
      throw new Error(
        'E2E database safety: a real Supabase URL is configured. The e2e suite uses the in-memory FakePrismaClient and must NOT run against a real database.',
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
    prisma.services.length = 0;
    prisma.faults.length = 0;
    prisma.faultServiceLinks.length = 0;
    prisma.technicianServices.length = 0;
    prisma.technicianProfiles.length = 0;
    prisma.areaRows.length = 0;
    seedDiscovery(prisma);
  });

  function ids(rows: Array<{ id: string }>): string[] {
    return rows.map((r) => r.id);
  }

  it('searches by text and lists all verified technicians without text', async () => {
    const byName = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ q: 'سامي' })
      .expect(200);
    expect(ids(byName.body.data)).toEqual([TECH_CAIRO]);

    const byBio = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ q: 'تبريد' })
      .expect(200);
    expect(ids(byBio.body.data)).toEqual([TECH_ALEX]);

    const all = await request(app.getHttpServer()).get('/api/v1/technicians').expect(200);
    expect(ids(all.body.data)).toEqual([TECH_ALEX, TECH_CAIRO]);
    expect(all.body.meta).toMatchObject({ page: 1, total: 2 });
  });

  it('filters by service, fault, and appliance category', async () => {
    const byService = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ service_id: SVC_WASHING })
      .expect(200);
    expect(ids(byService.body.data)).toEqual([TECH_CAIRO]);

    const byFault = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ fault_id: FAULT_WASHING })
      .expect(200);
    expect(ids(byFault.body.data)).toEqual([TECH_CAIRO]);

    const byCategory = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ appliance_category_id: CAT_FRIDGE })
      .expect(200);
    expect(ids(byCategory.body.data)).toEqual([TECH_ALEX]);

    // Combined: service + fault must hold on the same offered service.
    const combined = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ service_id: SVC_WASHING, fault_id: FAULT_WASHING })
      .expect(200);
    expect(ids(combined.body.data)).toEqual([TECH_CAIRO]);

    const mismatch = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ service_id: SVC_FRIDGE, fault_id: FAULT_WASHING })
      .expect(200);
    expect(mismatch.body.data).toEqual([]);
  });

  it('filters by decimal rating_min and availability, combined', async () => {
    const rated = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ rating_min: 4.8 })
      .expect(200);
    expect(ids(rated.body.data)).toEqual([TECH_ALEX]);

    const available = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ availability: 'available' })
      .expect(200);
    expect(ids(available.body.data)).toEqual([TECH_CAIRO]);

    const combined = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ rating_min: 4.5, availability: 'available', q: 'غسالات' })
      .expect(200);
    expect(ids(combined.body.data)).toEqual([TECH_CAIRO]);
  });

  it('matches service areas by label containment (not geo)', async () => {
    const cairo = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ area: 'مدينة نصر' })
      .expect(200);
    expect(ids(cairo.body.data)).toEqual([TECH_CAIRO]);

    const alex = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ area: 'سموحة' })
      .expect(200);
    expect(ids(alex.body.data)).toEqual([TECH_ALEX]);

    const nowhere = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ area: 'أسوان' })
      .expect(200);
    expect(nowhere.body.data).toEqual([]);
  });

  it('exposes public area labels on list and detail (no coordinates)', async () => {
    const list = await request(app.getHttpServer()).get('/api/v1/technicians').expect(200);
    const cairo = (list.body.data as Array<Record<string, unknown>>).find(
      (t) => t['id'] === TECH_CAIRO,
    );
    expect(cairo?.['areasAr']).toEqual(['القاهرة – مدينة نصر']);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/technicians/${TECH_CAIRO}`)
      .expect(200);
    expect(detail.body.data.areasAr).toEqual(['القاهرة – مدينة نصر']);
  });

  it('rejects invalid filter and pagination values with 400', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ service_id: 'not-a-uuid' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ rating_min: 6 })
      .expect(400);
    await request(app.getHttpServer()).get('/api/v1/technicians').query({ page: 0 }).expect(400);
    await request(app.getHttpServer()).get('/api/v1/technicians').query({ limit: 200 }).expect(400);
  });

  it('paginates deterministically (rating desc, stable id tiebreak)', async () => {
    const page1 = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ limit: 1, page: 1 })
      .expect(200);
    const page2 = await request(app.getHttpServer())
      .get('/api/v1/technicians')
      .query({ limit: 1, page: 2 })
      .expect(200);
    expect(ids(page1.body.data)).toEqual([TECH_ALEX]);
    expect(ids(page2.body.data)).toEqual([TECH_CAIRO]);
    expect(page1.body.meta).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
      hasNext: true,
    });
    expect(page2.body.meta).toMatchObject({
      page: 2,
      limit: 1,
      total: 2,
      totalPages: 2,
      hasNext: false,
    });
  });

  it('never lists unverified technicians and leaks no private data', async () => {
    const all = await request(app.getHttpServer()).get('/api/v1/technicians').expect(200);
    expect(ids(all.body.data)).not.toContain(TECH_UNVERIFIED);

    for (const row of all.body.data as Array<Record<string, unknown>>) {
      expect(row).not.toHaveProperty('userId');
      expect(row).not.toHaveProperty('phone');
      expect(row).not.toHaveProperty('serviceAreas');
    }

    await request(app.getHttpServer()).get(`/api/v1/technicians/${TECH_UNVERIFIED}`).expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/technicians/99999999-9999-4999-8999-999999999999')
      .expect(404);
  });
});
