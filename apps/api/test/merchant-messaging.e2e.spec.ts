/**
 * End-to-end tests for merchant messaging (Phase D):
 *   - product → merchant conversation (customer/technician initiate)
 *   - GET /conversations list (participant-scoped, real last message/unread)
 *   - read/send by the merchant; cross-role isolation by IDOR
 *   - unread counts are server-authoritative (read on open)
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

describe('merchant messaging e2e', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;

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
    prisma.conversations.length = 0;
    prisma.conversationParticipants.length = 0;
    prisma.messageRows.length = 0;
  });

  interface Session { accessToken: string; userId: string }

  async function register(role: 'customer' | 'technician' | 'merchant', email: string): Promise<Session> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role, email, password: PASSWORD })
      .expect(201);
    return { accessToken: res.body.data.accessToken, userId: res.body.data.user.id };
  }

  async function merchantWithProduct(businessName = 'متجر الأخبار'): Promise<{ session: Session; productId: string }> {
    const merchant = await register('merchant', `m-${Date.now()}-${Math.random()}@example.com`);
    await request(app.getHttpServer())
      .patch('/api/v1/merchant/profile')
      .set('Authorization', `Bearer ${merchant.accessToken}`)
      .send({ businessName })
      .expect(200);
    const created = await request(app.getHttpServer())
      .post('/api/v1/merchant/products')
      .set('Authorization', `Bearer ${merchant.accessToken}`)
      .send({ nameAr: 'فلتر تكييف', descriptionAr: 'فلتر قابل للغسل', price: 75 })
      .expect(201);
    return { session: merchant, productId: created.body.data.id as string };
  }

  it('creates a product conversation; merchant sees it, reads and replies; IDOR blocked', async () => {
    const customer = await register('customer', 'c-msg@example.com');
    const { session: merchant, productId } = await merchantWithProduct();
    const outsiderMerchant = await merchantWithProduct('متجر آخر');
    const outsiderCustomer = await register('customer', 'x-msg@example.com');

    // Customer initiates from the product.
    const started = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/conversation`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    const conversationId = started.body.data.id as string;
    expect(started.body.data.productId).toBe(productId);
    expect(started.body.data.serviceRequestId).toBeNull();
    expect(started.body.data.requestStatus).toBeNull();

    // Idempotent: re-opening returns the same conversation.
    const again = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/conversation`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    expect(again.body.data.id).toBe(conversationId);

    // Customer sends.
    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({ body: 'هل الفلتر متوفر؟' })
      .expect(201);

    // Merchant list shows the conversation with peer 'عميل' and 1 unread.
    const merchantList = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${merchant.accessToken}`)
      .expect(200);
    expect(merchantList.body.data).toHaveLength(1);
    expect(merchantList.body.data[0]).toMatchObject({
      id: conversationId,
      peerNameAr: 'عميل',
      lastMessageAr: 'هل الفلتر متوفر؟',
      unreadCount: 1,
      productId,
    });

    // Merchant reads (marks read) then replies.
    const history = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${merchant.accessToken}`)
      .expect(200);
    expect(history.body.data.map((m: { body: string }) => m.body)).toEqual(['هل الفلتر متوفر؟']);
    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${merchant.accessToken}`)
      .send({ body: 'نعم متوفر' })
      .expect(201);

    // Merchant unread is now 0; the customer has 1 unread (the merchant reply).
    const merchantList2 = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${merchant.accessToken}`)
      .expect(200);
    expect(merchantList2.body.data[0].unreadCount).toBe(0);

    const customerList = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    expect(customerList.body.data).toHaveLength(1);
    expect(customerList.body.data[0]).toMatchObject({
      peerNameAr: 'متجر الأخبار',
      lastMessageAr: 'نعم متوفر',
      unreadCount: 1,
    });

    // Customer reads → unread drops to 0.
    await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    const customerList2 = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .expect(200);
    expect(customerList2.body.data[0].unreadCount).toBe(0);

    // IDOR: unrelated customer and unrelated merchant are blocked.
    for (const outsider of [outsiderCustomer, outsiderMerchant.session]) {
      const read = await request(app.getHttpServer())
        .get(`/api/v1/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${outsider.accessToken}`);
      expect(read.status).toBe(404);
      const send = await request(app.getHttpServer())
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .send({ body: 'اختراق' });
      expect(send.status).toBe(404);
    }
  });

  it('lists an empty set for a merchant with no conversations (no fake data)', async () => {
    const { session: merchant } = await merchantWithProduct();
    const list = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${merchant.accessToken}`)
      .expect(200);
    expect(list.body.data).toEqual([]);
  });

  it('rejects merchant-initiated product conversations and non-participants on the product route', async () => {
    const { session: merchant, productId } = await merchantWithProduct();
    // A merchant cannot be the buyer side.
    const asMerchant = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/conversation`)
      .set('Authorization', `Bearer ${merchant.accessToken}`);
    expect(asMerchant.status).toBe(404);

    // Unauthenticated is rejected.
    const anon = await request(app.getHttpServer()).get(`/api/v1/products/${productId}/conversation`);
    expect(anon.status).toBe(401);
  });

  it('requires authentication for the conversation list', async () => {
    const anon = await request(app.getHttpServer()).get('/api/v1/conversations');
    expect(anon.status).toBe(401);
    expect(anon.body.error.code).toBe('AUTH_REQUIRED');
  });
});
