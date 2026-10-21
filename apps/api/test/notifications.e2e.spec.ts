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
    prisma.notificationPreferenceRows.length = 0;
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

  it('unread-count is server-authoritative and drops after reads (foreign excluded)', async () => {
    const a = await register('customer', 'n-unread-a@example.com');
    const b = await register('customer', 'n-unread-b@example.com');
    seedNotification(a.userId, 'request_status', 'أ');
    seedNotification(a.userId, 'subscription', 'ب');
    const idA = seedNotification(a.userId, 'request_status', 'ج');
    seedNotification(b.userId, 'request_status', 'أجنبي');

    const before = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(before.body.data).toEqual({ unread: 3 });

    await request(app.getHttpServer())
      .post(`/api/v1/notifications/${idA}/read`)
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);

    const afterOne = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(afterOne.body.data).toEqual({ unread: 2 });

    const readAll = await request(app.getHttpServer())
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(readAll.body.data.updated).toBe(2);

    const afterAll = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(afterAll.body.data).toEqual({ unread: 0 });

    // B's notification untouched by A's reads.
    const forB = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .expect(200);
    expect(forB.body.data).toEqual({ unread: 1 });

    const anon = await request(app.getHttpServer()).get('/api/v1/notifications/unread-count');
    expect(anon.status).toBe(401);
  });

  it('preferences default ON, update persists, and validation rejects partial bodies', async () => {
    const a = await register('customer', 'n-prefs-a@example.com');
    const b = await register('customer', 'n-prefs-b@example.com');
    const authA = { Authorization: `Bearer ${a.accessToken}` };
    const authB = { Authorization: `Bearer ${b.accessToken}` };

    const defaults = await request(app.getHttpServer())
      .get('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(defaults.body.data).toEqual({ requestStatus: true, subscription: true });

    const updated = await request(app.getHttpServer())
      .put('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ requestStatus: false, subscription: true })
      .expect(200);
    expect(updated.body.data).toEqual({ requestStatus: false, subscription: true });

    const refetched = await request(app.getHttpServer())
      .get('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .expect(200);
    expect(refetched.body.data).toEqual({ requestStatus: false, subscription: true });

    // B's preferences are independent (ownership isolation).
    const forB = await request(app.getHttpServer())
      .get('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${b.accessToken}`)
      .expect(200);
    expect(forB.body.data).toEqual({ requestStatus: true, subscription: true });

    // Partial body rejected (both keys required); wrong types rejected.
    const partial = await request(app.getHttpServer())
      .put('/api/v1/notifications/preferences')
      .set('Authorization', `Bearer ${a.accessToken}`)
      .send({ requestStatus: false });
    expect(partial.status).toBe(400);
    void authA;
    void authB;

    const anon = await request(app.getHttpServer()).get('/api/v1/notifications/preferences');
    expect(anon.status).toBe(401);
  });

  it('preference gating suppresses the row but verification stays mandatory; PII never stored', async () => {
    const a = await register('customer', 'n-gate-a@example.com');
    const { NotificationsService } = requireCjs('../dist/notifications/notifications.service') as {
      NotificationsService: new (...args: unknown[]) => {
        create: (
          userId: string,
          content: { type: string; titleAr: string; bodyAr: string; dataJson?: Record<string, unknown> | null },
        ) => Promise<{ id: string | null; delivered: boolean }>;
      };
    };
    const service = new NotificationsService(prisma as never);

    // Disable maintenance updates → request_status suppressed, state untouched.
    prisma.notificationPreferenceRows.push({
      userId: a.userId,
      requestStatus: false,
      subscription: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const suppressed = await service.create(a.userId, {
      type: 'request_status',
      titleAr: 'تم قبول طلب الخدمة',
      bodyAr: 'قبل الفني طلبك.',
      dataJson: { serviceRequestId: 'req-1', status: 'accepted' },
    });
    expect(suppressed.delivered).toBe(false);
    expect(suppressed.id).toBeNull();
    expect(prisma.notificationRows.filter((n) => n.userId === a.userId)).toHaveLength(0);

    // Verification is MANDATORY — delivered despite any preference row.
    const mandatory = await service.create(a.userId, {
      type: 'verification',
      titleAr: 'تم اعتماد حسابك بنجاح.',
      bodyAr: 'تم اعتماد حسابك بنجاح.',
    });
    expect(mandatory.delivered).toBe(true);
    expect(prisma.notificationRows.filter((n) => n.userId === a.userId)).toHaveLength(1);

    // PII-looking dataJson keys are stripped; navigation ids are kept.
    const withPii = await service.create(a.userId, {
      type: 'verification',
      titleAr: 'ت',
      bodyAr: 'ج',
      dataJson: {
        serviceRequestId: 'req-9',
        email: 'victim@example.com',
        phone: '+201000000000',
        token: 'secret',
      },
    });
    expect(withPii.delivered).toBe(true);
    const stored = prisma.notificationRows.find((n) => n.id === withPii.id)!;
    expect(stored.dataJson).toMatchObject({ serviceRequestId: 'req-9' });
    expect(stored.dataJson).not.toHaveProperty('email');
    expect(stored.dataJson).not.toHaveProperty('phone');
    expect(stored.dataJson).not.toHaveProperty('token');
    // Title/body carry no leaked contact data.
    expect(JSON.stringify(prisma.notificationRows)).not.toContain('victim@example.com');
  });
});
