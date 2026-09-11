/**
 * End-to-end tests for Notifications (Task 10H): own-list pagination,
 * recipient-only read state, read-all, ownership isolation. Persistence
 * only — no delivery provider.
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

describe('notifications e2e', () => {
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
    prisma.notificationRows.length = 0;
  });

  interface Session { accessToken: string; userId: string }

  async function register(role: 'customer' | 'technician' | 'merchant', email: string): Promise<Session> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role, email, password: PASSWORD })
      .expect(201);
    return { accessToken: res.body.data.accessToken, userId: res.body.data.user.id };
  }

  let notifSeq = 0;
  function seedNotification(userId: string, type: string, titleAr: string, readAt: Date | null = null): string {
    notifSeq += 1;
    // Deterministic increasing id + timestamp: ordering assertions stay stable.
    const id = `88888888-0000-4000-8000-${String(notifSeq).padStart(12, '0')}`;
    prisma.notificationRows.push({
      id,
      userId,
      type,
      titleAr,
      bodyAr: `محتوى ${titleAr}`,
      dataJson: null,
      readAt,
      createdAt: new Date(Date.now() + notifSeq * 1000),
    });
    return id;
  }

  it('lists own notifications newest-first with pagination; others’ are invisible', async () => {
    const a = await register('customer', 'n-a@example.com');
    const b = await register('customer', 'n-b@example.com');
    seedNotification(a.userId, 'request_status', 'تم تحديث طلبك');
    seedNotification(a.userId, 'request_status', 'تم قبول طلبك');
    seedNotification(b.userId, 'account', 'مرحباً بك');

    const own = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(own.body.data).toHaveLength(2);
    expect(own.body.data[0].titleAr).toBe('تم قبول طلبك');
    expect(own.body.data[0]).not.toHaveProperty('userId');

    const foreign = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .expect(200);
    expect(foreign.body.data).toHaveLength(1);
    expect(foreign.body.data[0].titleAr).toBe('مرحباً بك');
  });

  it('marks one notification read (recipient-only, idempotent) and blocks foreign ids', async () => {
    const a = await register('customer', 'n-read-a@example.com');
    const b = await register('customer', 'n-read-b@example.com');
    const idA = seedNotification(a.userId, 'request_status', 'إشعار أ');

    const read = await request(app.getHttpServer())
      .post(`/api/v1/notifications/${idA}/read`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(read.body.data.readAt).toBeTypeOf('string');

    // Idempotent second read.
    const again = await request(app.getHttpServer())
      .post(`/api/v1/notifications/${idA}/read`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(again.body.data.readAt).toBeTypeOf('string');

    // B cannot read A's notification.
    const foreign = await request(app.getHttpServer())
      .post(`/api/v1/notifications/${idA}/read`)
      .set('Authorization', `Bearer ${b.accessToken}`);
    expect(foreign.status).toBe(404);
    expect(foreign.body.error.message).toBe('Notification not found');
  });

  it('read-all marks only own unread notifications', async () => {
    const a = await register('customer', 'n-all@example.com');
    const b = await register('customer', 'n-all-b@example.com');
    seedNotification(a.userId, 'request_status', 'أ');
    seedNotification(a.userId, 'request_status', 'ب');
    const idB = seedNotification(b.userId, 'request_status', 'ج', new Date());

    const res = await request(app.getHttpServer())
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(res.body.data.updated).toBe(2);
    // B's already-read notification untouched (still exactly its own state).
    const bRow = prisma.notificationRows.find((n) => n.id === idB)!;
    expect(bRow.readAt).not.toBeNull();

    const unreadForA = prisma.notificationRows.filter((n) => n.userId === a.userId && n.readAt === null);
    expect(unreadForA).toHaveLength(0);
  });

  it('requires authentication and validates pagination', async () => {
    const anon = await request(app.getHttpServer()).get('/api/v1/notifications');
    expect(anon.status).toBe(401);
    const customer = await register('customer', 'n-valid@example.com');
    const bad = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .query({ limit: 101 });
    expect(bad.status).toBe(400);
  });
});
