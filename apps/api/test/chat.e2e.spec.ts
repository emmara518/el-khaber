/**
 * End-to-end tests for the Chat domain (Task 10H):
 * shared service-request conversation, lazy creation, participant
 * authorization (IDOR-safe), sender identity, bounded history.
 * NO realtime — HTTP persistence only.
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

describe('chat e2e', () => {
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
    prisma.conversations.length = 0;
    prisma.conversationParticipants.length = 0;
    prisma.messageRows.length = 0;
    prisma.applianceCategories.push({ id: CAT_ID, nameAr: 'غسالات', slug: 'washing_machine', iconUrl: null, imageUrl: null, isActive: true, sortOrder: 1 });
    prisma.locations.push({ id: LOC_ID, userId: '', label: 'المنزل', addressText: 'شارع', city: 'الرياض', region: null, country: null, latitude: 24.7, longitude: 46.7 });
  });

  interface Session { accessToken: string; userId: string }

  async function register(role: 'customer' | 'technician' | 'merchant', email: string): Promise<Session> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role, email, password: PASSWORD })
      .expect(201);
    return { accessToken: res.body.data.accessToken, userId: res.body.data.user.id };
  }

  /** Completed request through the real lifecycle (Task 10F API). */
  async function completedRequest(customer: Session, technician: Session): Promise<string> {
    prisma.technicianProfiles.push({
      id: 'dddddddd-1111-4111-8111-111111111111', userId: technician.userId, displayName: 'فني', bio: null,
      avatarUrl: null, verificationStatus: 'verified', availabilityStatus: 'available',
      experienceYears: 3, completedServicesCount: 0, ratingAverage: null, ratingCount: 0,
    });
    prisma.locations[0]!.userId = customer.userId;
    const created = await request(app.getHttpServer())
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({
        technician_id: 'dddddddd-1111-4111-8111-111111111111',
        appliance_category_id: CAT_ID,
        problem_description: 'عطل',
        location_id: LOC_ID,
      })
      .expect(201);
    const id = created.body.data.id as string;
    const auth = { Authorization: `Bearer ${technician.accessToken}` };
    await request(app.getHttpServer()).post(`/api/v1/service-requests/${id}/accept`).set(auth).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/service-requests/${id}/start`).set(auth).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/service-requests/${id}/start`).set(auth).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/service-requests/${id}/complete`).set(auth).expect(200);
    return id;
  }

  it('lazily creates the conversation; both participants share it; IDOR blocks outsiders', async () => {
    const customer = await register('customer', 'c-chat@example.com');
    const technician = await register('technician', 't-chat@example.com');
    const outsider = await register('customer', 'x-chat@example.com');
    const merchant = await register('merchant', 'm-chat@example.com');
    const requestId = await completedRequest(customer, technician);

    const first = await request(app.getHttpServer())
      .get(`/api/v1/service-requests/${requestId}/conversation`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    expect(first.body.data.serviceRequestId).toBe(requestId);
    expect(first.body.data.requestStatus).toBe('completed');

    // Same conversation for the technician participant.
    const second = await request(app.getHttpServer())
      .get(`/api/v1/service-requests/${requestId}/conversation`)
      .set('Authorization', `Bearer ${technician.accessToken}`)
      .expect(200);
    expect(second.body.data.id).toBe(first.body.data.id);

    // Participants recorded (customer + technician).
    expect(prisma.conversationParticipants).toHaveLength(2);

    // Outsiders (unrelated customer, unrelated merchant) are blocked.
    const outsiderRes = await request(app.getHttpServer())
      .get(`/api/v1/service-requests/${requestId}/conversation`)
      .set('Authorization', `Bearer ${outsider.accessToken}`);
    expect(outsiderRes.status).toBe(404);
    expect(outsiderRes.body.error.code).toBe('NOT_FOUND');
    const merchantRes = await request(app.getHttpServer())
      .get(`/api/v1/service-requests/${requestId}/conversation`)
      .set('Authorization', `Bearer ${merchant.accessToken}`);
    expect(merchantRes.status).toBe(404);
  });

  it('sends messages with server-derived sender identity; content validated', async () => {
    const customer = await register('customer', 'c-send@example.com');
    const technician = await register('technician', 't-send@example.com');
    const requestId = await completedRequest(customer, technician);
    const conversation = await request(app.getHttpServer())
      .get(`/api/v1/service-requests/${requestId}/conversation`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    const conversationId = conversation.body.data.id as string;

    const sent = await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ body: 'مرحباً، متى ستصل؟', senderUserId: 'spoofed-user' })
      .expect(201);
    expect(sent.body.data.senderUserId).toBe(customer.userId);
    expect(sent.body.data.body).toBe('مرحباً، متى ستصل؟');
    expect(sent.body.data.messageType).toBe('text');

    // Empty content rejected.
    const empty = await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ body: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('VALIDATION_ERROR');

    // Unauthenticated rejected.
    const anon = await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .send({ body: 'x' });
    expect(anon.status).toBe(401);
  });

  it('returns bounded deterministic history (newest first) with pagination meta', async () => {
    const customer = await register('customer', 'c-hist@example.com');
    const technician = await register('technician', 't-hist@example.com');
    const requestId = await completedRequest(customer, technician);
    const conversationId = (
      await request(app.getHttpServer())
        .get(`/api/v1/service-requests/${requestId}/conversation`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(200)
    ).body.data.id as string;
    const auth = { Authorization: `Bearer ${customer.accessToken}` };
    for (let i = 1; i <= 3; i += 1) {
      await request(app.getHttpServer())
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(auth)
        .send({ body: `رسالة ${String(i)}` })
        .expect(201);
    }

    const page1 = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set(auth)
      .query({ limit: 2, page: 1 })
      .expect(200);
    expect(page1.body.data.map((m: { body: string }) => m.body)).toEqual(['رسالة 3', 'رسالة 2']);
    expect(page1.body.meta).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2, hasNext: true });

    const page2 = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set(auth)
      .query({ limit: 2, page: 2 })
      .expect(200);
    expect(page2.body.data.map((m: { body: string }) => m.body)).toEqual(['رسالة 1']);
    expect(page2.body.meta.hasNext).toBe(false);
  });

  it('blocks message access for non-participants (IDOR)', async () => {
    const customer = await register('customer', 'c-idor2@example.com');
    const technician = await register('technician', 't-idor2@example.com');
    const outsider = await register('technician', 'x-idor2@example.com');
    const requestId = await completedRequest(customer, technician);
    const conversationId = (
      await request(app.getHttpServer())
        .get(`/api/v1/service-requests/${requestId}/conversation`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(200)
    ).body.data.id as string;

    const outsiderRes = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${outsider.accessToken}`);
    expect(outsiderRes.status).toBe(404);
    expect(outsiderRes.body.error.code).toBe('NOT_FOUND');

    const outsiderSend = await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .send({ body: 'x' });
    expect(outsiderSend.status).toBe(404);
  });
});
