/**
 * End-to-end tests for the unified conversations inbox (WP-Inbox):
 *   - GET /conversations is paginated (page/limit + meta) for every role
 *   - real peer identity (technician displayName, merchant businessName,
 *     generic customer label — never invented) + public avatars
 *   - real last message + timestamp + server-authoritative unread
 *   - thread context titles (order title / product name)
 *   - listing never creates conversations; outsiders see nothing
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

const PASSWORD = 'sup3rsecretP4ss';
const CAT_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const LOC_ID = 'eeeeeeee-1111-4111-8111-111111111111';
const TECH_PROFILE_ID = 'dddddddd-1111-4111-8111-111111111111';
const TECH_AVATAR = 'https://cdn.example.com/avatars/tech-1/photo.png';
const CUSTOMER_AVATAR = 'https://cdn.example.com/avatars/cust-1/photo.png';
const MERCHANT_LOGO = 'https://cdn.example.com/avatars/merch-1/logo.png';

describe('conversations inbox e2e (WP-Inbox)', () => {
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
    prisma.customerProfiles.length = 0;
    prisma.technicianProfiles.length = 0;
    prisma.merchantProfiles.length = 0;
    prisma.products.length = 0;
    prisma.serviceRequests.length = 0;
    prisma.serviceRequestStatusHistoryStore.length = 0;
    prisma.locations.length = 0;
    prisma.applianceCategories.length = 0;
    prisma.conversations.length = 0;
    prisma.conversationParticipants.length = 0;
    prisma.messageRows.length = 0;
    prisma.applianceCategories.push({
      id: CAT_ID,
      nameAr: 'غسالات',
      slug: 'washing_machine',
      iconUrl: null,
      imageUrl: null,
      isActive: true,
      sortOrder: 1,
    });
    prisma.locations.push({
      id: LOC_ID,
      userId: '',
      label: 'المنزل',
      addressText: 'شارع',
      city: 'القاهرة',
      region: null,
      country: null,
      latitude: 30.04,
      longitude: 31.24,
    });
  });

  interface Session {
    accessToken: string;
    userId: string;
  }

  async function register(
    role: 'customer' | 'technician' | 'merchant',
    email: string,
  ): Promise<Session> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role, email, password: PASSWORD })
      .expect(201);
    return { accessToken: res.body.data.accessToken, userId: res.body.data.user.id };
  }

  /** Technician with a real display name + avatar (as if uploaded before). */
  function seedTechnician(userId: string): void {
    prisma.technicianProfiles.push({
      id: TECH_PROFILE_ID,
      userId,
      displayName: 'سامي الفني',
      bio: null,
      avatarUrl: TECH_AVATAR,
      verificationStatus: 'verified',
      availabilityStatus: 'available',
      experienceYears: 3,
      completedServicesCount: 0,
      ratingAverage: null,
      ratingCount: 0,
    });
  }

  function seedCustomerAvatar(userId: string): void {
    prisma.customerProfiles.push({ id: `cust-${userId}`, userId, avatarUrl: CUSTOMER_AVATAR });
  }

  async function makeRequest(customer: Session, title: string): Promise<string> {
    prisma.locations[0]!.userId = customer.userId;
    const created = await request(app.getHttpServer())
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({
        technician_id: TECH_PROFILE_ID,
        appliance_category_id: CAT_ID,
        problem_title: title,
        problem_description: 'وصف العطل',
        location_id: LOC_ID,
      })
      .expect(201);
    return created.body.data.id as string;
  }

  async function merchantWithProduct(): Promise<{ session: Session; productId: string }> {
    const merchant = await register(
      'merchant',
      `m-inbox-${Date.now()}-${Math.random()}@example.com`,
    );
    await request(app.getHttpServer())
      .patch('/api/v1/merchant/profile')
      .set('Authorization', `Bearer ${merchant.accessToken}`)
      .send({ businessName: 'متجر النور' })
      .expect(200);
    const row = prisma.merchantProfiles.find((m) => m.userId === merchant.userId);
    if (row !== undefined) {
      row.logoUrl = MERCHANT_LOGO;
    }
    const created = await request(app.getHttpServer())
      .post('/api/v1/merchant/products')
      .set('Authorization', `Bearer ${merchant.accessToken}`)
      .send({ nameAr: 'فلتر تكييف', descriptionAr: 'فلتر', price: 75 })
      .expect(201);
    return { session: merchant, productId: created.body.data.id as string };
  }

  it('customer inbox: real peer, avatar, last message, unread, context + pagination meta', async () => {
    const customer = await register('customer', 'c-inbox@example.com');
    const technician = await register('technician', 't-inbox@example.com');
    seedTechnician(technician.userId);
    const { session: merchant, productId } = await merchantWithProduct();

    const requestId = await makeRequest(customer, 'الغسالة لا تعصر');

    // Request thread: open + customer sends.
    const conv = await request(app.getHttpServer())
      .get(`/api/v1/service-requests/${requestId}/conversation`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    const requestConvId = conv.body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${requestConvId}/messages`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ body: 'متى تصل؟' })
      .expect(201);

    // Product thread: open (no messages yet).
    const prodConv = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/conversation`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    const productConvId = prodConv.body.data.id as string;
    void merchant;

    // Inbox lists both, newest activity first, with meta.
    const list = await request(app.getHttpServer())
      .get('/api/v1/conversations?page=1&limit=20')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.meta).toMatchObject({ page: 1, total: 2 });

    const byId = new Map((list.body.data as Array<{ id: string }>).map((c) => [c.id, c]));
    const reqThread = byId.get(requestConvId) as Record<string, unknown>;
    expect(reqThread).toMatchObject({
      peerNameAr: 'سامي الفني',
      peerAvatarUrl: TECH_AVATAR,
      lastMessageAr: 'متى تصل؟',
      serviceRequestId: requestId,
      productId: null,
      contextTitleAr: 'الغسالة لا تعصر',
    });
    expect(typeof reqThread['lastMessageAt']).toBe('string');
    expect(Number.isNaN(Date.parse(reqThread['lastMessageAt'] as string))).toBe(false);

    const prodThread = byId.get(productConvId) as Record<string, unknown>;
    expect(prodThread).toMatchObject({
      peerNameAr: 'متجر النور',
      peerAvatarUrl: MERCHANT_LOGO,
      lastMessageAr: null,
      lastMessageAt: null,
      serviceRequestId: null,
      productId,
      contextTitleAr: 'فلتر تكييف',
    });

    // Pagination: page 2 with limit 1 returns the older thread.
    const page2 = await request(app.getHttpServer())
      .get('/api/v1/conversations?page=2&limit=1')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.meta).toMatchObject({ page: 2, total: 2, hasNext: false });

    // Listing creates nothing.
    expect(prisma.conversations.length).toBe(2);
  });

  it('technician inbox: generic customer label + customer avatar + unread, then read-to-zero', async () => {
    const customer = await register('customer', 'c-tinbox@example.com');
    const technician = await register('technician', 't-tinbox@example.com');
    seedTechnician(technician.userId);
    seedCustomerAvatar(customer.userId);
    const requestId = await makeRequest(customer, 'الثلاجة لا تبرد');

    const conv = await request(app.getHttpServer())
      .get(`/api/v1/service-requests/${requestId}/conversation`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    const conversationId = conv.body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ body: 'مساعدة من فضلك' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${technician.accessToken}`)
      .expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      id: conversationId,
      peerNameAr: 'عميل',
      peerAvatarUrl: CUSTOMER_AVATAR,
      lastMessageAr: 'مساعدة من فضلك',
      unreadCount: 1,
      contextTitleAr: 'الثلاجة لا تبرد',
    });

    // Opening the thread marks it read (server-authoritative).
    await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${technician.accessToken}`)
      .expect(200);
    const after = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${technician.accessToken}`)
      .expect(200);
    expect(after.body.data[0].unreadCount).toBe(0);
  });

  it('merchant inbox: technician-initiated product thread shows the technician identity', async () => {
    const technician = await register('technician', 't-minbox@example.com');
    seedTechnician(technician.userId);
    const { session: merchant, productId } = await merchantWithProduct();

    const started = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/conversation`)
      .set('Authorization', `Bearer ${technician.accessToken}`)
      .expect(200);
    const conversationId = started.body.data.id as string;
    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${technician.accessToken}`)
      .send({ body: 'هل يصلح لمكيف ٣ حصان؟' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${merchant.accessToken}`)
      .expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      id: conversationId,
      peerNameAr: 'سامي الفني',
      peerAvatarUrl: TECH_AVATAR,
      lastMessageAr: 'هل يصلح لمكيف ٣ حصان؟',
      unreadCount: 1,
      contextTitleAr: 'فلتر تكييف',
    });
  });

  it('empty inbox returns an empty list (no fake threads) and outsiders see nothing', async () => {
    const customer = await register('customer', 'c-empty@example.com');
    const outsider = await register('customer', 'x-empty@example.com');
    const technician = await register('technician', 't-empty@example.com');
    seedTechnician(technician.userId);
    const requestId = await makeRequest(customer, 'عطل تجريبي');
    await request(app.getHttpServer())
      .get(`/api/v1/service-requests/${requestId}/conversation`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);

    const empty = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${outsider.accessToken}`)
      .expect(200);
    expect(empty.body.data).toEqual([]);
    expect(empty.body.meta).toMatchObject({ total: 0 });
  });
});
