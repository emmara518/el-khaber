/**
 * End-to-end tests for Reviews (Task 10H): documented eligibility
 * (owner + completed + one-per-request), rating bounds, seeded tags,
 * duplicate prevention, public technician reviews list, derived metrics.
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createRequire } from 'node:module';
import request from 'supertest';

import { AppModule } from '../dist/app.module';
import { getConfig } from '../dist/config/app.config';
import { createFakePrisma, type FakePrismaClient } from './fake-prisma';

const requireCjs = createRequire(import.meta.url);
const { PrismaService } = requireCjs('../dist/database/prisma.service') as {
  PrismaService: new (...args: unknown[]) => unknown;
};

const PASSWORD = 'sup3rsecretP4ss';
const CAT_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const LOC_ID = 'eeeeeeee-1111-4111-8111-111111111111';
const TECH_PROFILE_ID = 'dddddddd-1111-4111-8111-111111111111';
const TAG_PUNCTUAL = '77777777-1111-4111-8111-111111111111';
const TAG_QUALITY = '77777777-2222-4222-8222-222222222222';
const TAG_UNKNOWN = '77777777-9999-4999-8999-999999999999';

describe('reviews e2e', () => {
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
    prisma.users.length = 0;
    prisma.refreshTokens.length = 0;
    prisma.technicianProfiles.length = 0;
    prisma.technicianServices.length = 0;
    prisma.serviceRequests.length = 0;
    prisma.serviceRequestStatusHistoryStore.length = 0;
    prisma.locations.length = 0;
    prisma.applianceCategories.length = 0;
    prisma.reviewRows.length = 0;
    prisma.reviewTagRows.length = 0;
    prisma.reviewTagAssignmentRows.length = 0;
    prisma.applianceCategories.push({ id: CAT_ID, nameAr: 'غسالات', slug: 'washing_machine', iconUrl: null, imageUrl: null, isActive: true, sortOrder: 1 });
    prisma.locations.push({ id: LOC_ID, userId: '', label: 'المنزل', addressText: 'شارع', city: 'الرياض', region: null, country: null, latitude: 24.7, longitude: 46.7 });
    prisma.reviewTagRows.push(
      { id: TAG_PUNCTUAL, code: 'punctuality', labelAr: 'الالتزام بالموعد', isActive: true },
      { id: TAG_QUALITY, code: 'repair_quality', labelAr: 'جودة الإصلاح', isActive: true },
    );
  });

  interface Session { accessToken: string; userId: string }

  async function register(role: 'customer' | 'technician' | 'merchant', email: string): Promise<Session> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role, email, password: PASSWORD })
      .expect(201);
    return { accessToken: res.body.data.accessToken, userId: res.body.data.user.id };
  }

  async function requestInStatus(
    customer: Session,
    technician: Session,
    target: 'completed' | 'accepted',
  ): Promise<string> {
    prisma.technicianProfiles.push({
      id: TECH_PROFILE_ID, userId: technician.userId, displayName: 'فني', bio: null,
      avatarUrl: null, verificationStatus: 'verified', availabilityStatus: 'available',
      experienceYears: 3, completedServicesCount: 0, ratingAverage: null, ratingCount: 0,
    });
    prisma.locations[0]!.userId = customer.userId;
    const created = await request(app.getHttpServer())
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({
        technician_id: TECH_PROFILE_ID,
        appliance_category_id: CAT_ID,
        problem_description: 'عطل',
        location_id: LOC_ID,
      })
      .expect(201);
    const id = created.body.data.id as string;
    const auth = { Authorization: `Bearer ${technician.accessToken}` };
    await request(app.getHttpServer()).post(`/api/v1/service-requests/${id}/accept`).set(auth).expect(200);
    if (target === 'completed') {
      await request(app.getHttpServer()).post(`/api/v1/service-requests/${id}/start`).set(auth).expect(200);
      await request(app.getHttpServer()).post(`/api/v1/service-requests/${id}/start`).set(auth).expect(200);
      await request(app.getHttpServer()).post(`/api/v1/service-requests/${id}/complete`).set(auth).expect(200);
    }
    return id;
  }

  it('creates a review on a completed request with rating, comment, and seeded tags', async () => {
    const customer = await register('customer', 'r-create@example.com');
    const technician = await register('technician', 'r-tech@example.com');
    const requestId = await requestInStatus(customer, technician, 'completed');

    const res = await request(app.getHttpServer())
      .post(`/api/v1/service-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ rating: 5, comment: 'عمل ممتاز', tag_ids: [TAG_PUNCTUAL, TAG_QUALITY] })
      .expect(201);
    expect(res.body.data).toMatchObject({ rating: 5, comment: 'عمل ممتاز', tags: ['الالتزام بالموعد', 'جودة الإصلاح'] });

    // Derived metrics recomputed server-side (docs/06 §27).
    const profile = prisma.technicianProfiles[0]!;
    expect(profile.ratingCount).toBe(1);
    expect(profile.ratingAverage).toBe(5);
  });

  it('blocks review before completion and duplicate reviews (canonical conflicts)', async () => {
    const customer = await register('customer', 'r-early@example.com');
    const technician = await register('technician', 'r-tech2@example.com');
    const acceptedId = await requestInStatus(customer, technician, 'accepted');

    const early = await request(app.getHttpServer())
      .post(`/api/v1/service-requests/${acceptedId}/review`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ rating: 4 });
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe('INVALID_STATE_TRANSITION');

    const completedId = await requestInStatus(customer, technician, 'completed');
    await request(app.getHttpServer())
      .post(`/api/v1/service-requests/${completedId}/review`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ rating: 4 })
      .expect(201);
    const duplicate = await request(app.getHttpServer())
      .post(`/api/v1/service-requests/${completedId}/review`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ rating: 5 });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
  });

  it('blocks unrelated customers, validates bounds, and rejects unknown tags', async () => {
    const customer = await register('customer', 'r-owner@example.com');
    const outsider = await register('customer', 'r-out@example.com');
    const technician = await register('technician', 'r-tech3@example.com');
    const requestId = await requestInStatus(customer, technician, 'completed');

    const foreign = await request(app.getHttpServer())
      .post(`/api/v1/service-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({ rating: 5 });
    expect(foreign.status).toBe(404);

    const low = await request(app.getHttpServer())
      .post(`/api/v1/service-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ rating: 0 });
    expect(low.status).toBe(400);
    const high = await request(app.getHttpServer())
      .post(`/api/v1/service-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ rating: 6 });
    expect(high.status).toBe(400);

    const unknownTag = await request(app.getHttpServer())
      .post(`/api/v1/service-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ rating: 3, tag_ids: [TAG_UNKNOWN] });
    expect(unknownTag.status).toBe(404);
  });

  it('technician cannot review (role-gated to customers)', async () => {
    const customer = await register('customer', 'r-self@example.com');
    const technician = await register('technician', 'r-tech4@example.com');
    const requestId = await requestInStatus(customer, technician, 'completed');

    const selfReview = await request(app.getHttpServer())
      .post(`/api/v1/service-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${technician.accessToken}`)
      .send({ rating: 5 });
    expect(selfReview.status).toBe(401);
    expect(selfReview.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('public technician reviews list: bounded, newest first, public fields only', async () => {
    const customer = await register('customer', 'r-pub@example.com');
    const technician = await register('technician', 'r-tech5@example.com');
    const requestId = await requestInStatus(customer, technician, 'completed');
    await request(app.getHttpServer())
      .post(`/api/v1/service-requests/${requestId}/review`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ rating: 4, comment: 'جيد جداً', tag_ids: [TAG_QUALITY] })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/api/v1/technicians/${TECH_PROFILE_ID}/reviews`)
      .query({ limit: 100 })
      .expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ rating: 4, comment: 'جيد جداً', tags: ['جودة الإصلاح'] });
    expect(list.body.data[0]).not.toHaveProperty('customerId');
    expect(list.body.data[0]).not.toHaveProperty('technicianId');
    expect(list.body.meta.total).toBe(1);

    // Non-public technician → identical 404.
    const pendingTech = 'dddddddd-9999-4999-8999-999999999999';
    prisma.technicianProfiles.push({
      id: pendingTech, userId: uid(), displayName: null, bio: null, avatarUrl: null,
      verificationStatus: 'pending', availabilityStatus: 'unavailable',
      experienceYears: 0, completedServicesCount: 0, ratingAverage: null, ratingCount: 0,
    });
    const hidden = await request(app.getHttpServer()).get(`/api/v1/technicians/${pendingTech}/reviews`);
    expect(hidden.status).toBe(404);
  });
});

function uid(): string {
  return '00000000-0000-4000-8000-' + String(Math.floor(Math.random() * 1e12)).padStart(12, '0');
}
