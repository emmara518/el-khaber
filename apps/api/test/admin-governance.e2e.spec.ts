/**
 * End-to-end tests for admin governance (WP-Admin-01…04):
 *   - role matrix enforcement (allowed/denied per AdminRole, DB-authoritative)
 *   - verification decisions require a reason for rejected/suspended,
 *     audited with the reason and notified to the user
 *   - pending-only technician assignment (verified techs, atomic, audited,
 *     both parties notified)
 *   - review removal requires a reason (audited; metrics recomputed)
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
const { hashPassword } = requireCjs('../dist/auth/password') as {
  hashPassword: (plain: string) => Promise<string>;
};

const PASSWORD = 'AdminPassw0rd!';
const TECH_PROFILE = 'dddddddd-1111-4111-8111-111111111111';
const TECH_UNVERIFIED = 'dddddddd-2222-4222-8222-222222222222';
const REQUEST_PENDING = 'aaaaaaaa-1111-4111-8111-111111111111';
const REQUEST_ACTIVE = 'aaaaaaaa-2222-4222-8222-222222222222';
const REVIEW_ID = 'bbbbbbbb-1111-4111-8111-111111111111';

type AdminRole =
  | 'super_admin'
  | 'operations_admin'
  | 'content_admin'
  | 'support_admin'
  | 'finance_admin';

describe('admin governance e2e (WP-Admin-01…04)', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;
  const tokens = new Map<AdminRole, string>();

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
    process.env['ADMIN_JWT_ACCESS_TTL'] = '900';
    process.env['ADMIN_JWT_REFRESH_TTL'] = '2592000';
    process.env['ADMIN_JWT_ISSUER'] = 'khabir-admin-api';
    process.env['ADMIN_JWT_AUDIENCE'] = 'khabir-admin';
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

  async function loginAs(role: AdminRole): Promise<string> {
    const email = `${role}@example.com`;
    prisma.adminUsers.push({
      id: `admin-${role}`,
      email,
      passwordHash: await hashPassword(PASSWORD),
      role,
      status: 'active',
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const res = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return res.body.data.accessToken as string;
  }

  beforeEach(async () => {
    prisma.users.length = 0;
    prisma.adminUsers.length = 0;
    prisma.adminRefreshTokens.length = 0;
    prisma.technicianProfiles.length = 0;
    prisma.merchantProfiles.length = 0;
    prisma.serviceRequests.length = 0;
    prisma.serviceRequestStatusHistoryStore.length = 0;
    prisma.reviewRows.length = 0;
    prisma.auditLogRows.length = 0;
    prisma.notificationRows.length = 0;
    tokens.clear();

    for (const role of [
      'super_admin',
      'operations_admin',
      'content_admin',
      'support_admin',
      'finance_admin',
    ] as const) {
      tokens.set(role, await loginAs(role));
    }

    prisma.technicianProfiles.push(
      {
        id: TECH_PROFILE,
        userId: 'tech-user-1',
        displayName: 'فني معتمد',
        bio: null,
        avatarUrl: null,
        verificationStatus: 'verified',
        availabilityStatus: 'available',
        experienceYears: 5,
        completedServicesCount: 10,
        ratingAverage: 4.5,
        ratingCount: 4,
      },
      {
        id: TECH_UNVERIFIED,
        userId: 'tech-user-2',
        displayName: 'فني غير موثق',
        bio: null,
        avatarUrl: null,
        verificationStatus: 'pending',
        availabilityStatus: 'unavailable',
        experienceYears: 1,
        completedServicesCount: 0,
        ratingAverage: null,
        ratingCount: 0,
      },
    );
    const now = new Date();
    prisma.serviceRequests.push(
      {
        id: REQUEST_PENDING,
        customerId: 'cust-1',
        technicianId: null,
        applianceCategoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        serviceId: null,
        faultId: null,
        status: 'pending',
        problemTitle: 'عطل تجريبي',
        problemDescription: 'وصف',
        locationId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        scheduledAt: null,
        acceptedAt: null,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: REQUEST_ACTIVE,
        customerId: 'cust-1',
        technicianId: TECH_PROFILE,
        applianceCategoryId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        serviceId: null,
        faultId: null,
        status: 'in_progress',
        problemTitle: 'عطل نشط',
        problemDescription: 'وصف',
        locationId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        scheduledAt: null,
        acceptedAt: null,
        startedAt: now,
        completedAt: null,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
      },
    );
    prisma.reviewRows.push({
      id: REVIEW_ID,
      serviceRequestId: REQUEST_ACTIVE,
      customerId: 'cust-1',
      technicianId: TECH_PROFILE,
      rating: 5,
      comment: 'ممتاز',
      problemResolved: true,
      createdAt: now,
      updatedAt: now,
    });
  });

  function auth(role: AdminRole): { Authorization: string } {
    return { Authorization: `Bearer ${tokens.get(role) as string}` };
  }

  describe('WP-Admin-01: role matrix is enforced server-side', () => {
    it('super_admin can access every operational route', async () => {
      const admin = auth('super_admin');
      await request(app.getHttpServer()).get('/api/v1/admin/metrics').set(admin).expect(200);
      await request(app.getHttpServer()).get('/api/v1/admin/users').set(admin).expect(200);
      await request(app.getHttpServer()).get('/api/v1/admin/technicians').set(admin).expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/admin/service-requests')
        .set(admin)
        .expect(200);
      await request(app.getHttpServer()).get('/api/v1/admin/reviews').set(admin).expect(200);
      await request(app.getHttpServer()).get('/api/v1/admin/audit-logs').set(admin).expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments/config')
        .set(admin)
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments/submissions')
        .set(admin)
        .expect(200);
    });

    it('support_admin reads users/requests/reviews but cannot verify, override, audit, or touch payments config', async () => {
      const admin = auth('support_admin');
      await request(app.getHttpServer()).get('/api/v1/admin/users').set(admin).expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/admin/service-requests')
        .set(admin)
        .expect(200);
      await request(app.getHttpServer()).get('/api/v1/admin/reviews').set(admin).expect(200);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/technicians/${TECH_PROFILE}/verification`)
        .set(admin)
        .send({ status: 'verified' })
        .expect(401);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/service-requests/${REQUEST_PENDING}/status`)
        .set(admin)
        .send({ status: 'cancelled' })
        .expect(401);
      await request(app.getHttpServer()).get('/api/v1/admin/audit-logs').set(admin).expect(401);
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments/config')
        .set(admin)
        .expect(401);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/service-requests/${REQUEST_PENDING}/assign`)
        .set(admin)
        .send({ technician_id: TECH_PROFILE })
        .expect(401);
    });

    it('content_admin reads reviews but cannot verify, list users, or read audit', async () => {
      const admin = auth('content_admin');
      await request(app.getHttpServer()).get('/api/v1/admin/reviews').set(admin).expect(200);
      await request(app.getHttpServer()).get('/api/v1/admin/users').set(admin).expect(401);
      await request(app.getHttpServer()).get('/api/v1/admin/audit-logs').set(admin).expect(401);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/technicians/${TECH_PROFILE}/verification`)
        .set(admin)
        .send({ status: 'verified' })
        .expect(401);
    });

    it('finance_admin manages payments config but cannot verify or override requests', async () => {
      const admin = auth('finance_admin');
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments/config')
        .set(admin)
        .expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments/submissions')
        .set(admin)
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/technicians/${TECH_PROFILE}/verification`)
        .set(admin)
        .send({ status: 'verified' })
        .expect(401);
      await request(app.getHttpServer())
        .post(`/api/v1/admin/service-requests/${REQUEST_PENDING}/status`)
        .set(admin)
        .send({ status: 'cancelled' })
        .expect(401);
      await request(app.getHttpServer()).get('/api/v1/admin/users').set(admin).expect(401);
    });

    it('operations_admin verifies and overrides but cannot touch payments config or grants', async () => {
      const admin = auth('operations_admin');
      await request(app.getHttpServer())
        .post(`/api/v1/admin/technicians/${TECH_UNVERIFIED}/verification`)
        .set(admin)
        .send({ status: 'verified' })
        .expect(200);
      await request(app.getHttpServer()).get('/api/v1/admin/audit-logs').set(admin).expect(200);
      await request(app.getHttpServer())
        .get('/api/v1/admin/payments/config')
        .set(admin)
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/v1/admin/subscriptions/grant')
        .set(admin)
        .send({ user_id: 'cust-1', plan_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' })
        .expect(401);
    });

    it('role changes apply on the next request (DB-authoritative, not token claim)', async () => {
      const admin = auth('operations_admin');
      await request(app.getHttpServer()).get('/api/v1/admin/audit-logs').set(admin).expect(200);
      // Demote in the database; the SAME token must now fail.
      const row = prisma.adminUsers.find((a) => a.id === 'admin-operations_admin');
      if (row !== undefined) {
        row.role = 'support_admin';
      }
      await request(app.getHttpServer()).get('/api/v1/admin/audit-logs').set(admin).expect(401);
    });
  });

  describe('WP-Admin-02: verification decisions carry an audited reason', () => {
    it('rejects a rejection without reason and audits + notifies with the reason', async () => {
      const admin = auth('operations_admin');
      await request(app.getHttpServer())
        .post(`/api/v1/admin/technicians/${TECH_UNVERIFIED}/verification`)
        .set(admin)
        .send({ status: 'rejected' })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/technicians/${TECH_UNVERIFIED}/verification`)
        .set(admin)
        .send({ status: 'rejected', reason: 'مستندات غير مكتملة' })
        .expect(200);

      const audits = prisma.auditLogRows.filter(
        (a) => a.entityType === 'technician_verification' && a.entityId === TECH_UNVERIFIED,
      );
      expect(audits).toHaveLength(1);
      expect(audits[0]?.afterJson).toMatchObject({
        verificationStatus: 'rejected',
        reason: 'مستندات غير مكتملة',
      });
      const notes = prisma.notificationRows.filter((n) => n.userId === 'tech-user-2');
      expect(notes).toHaveLength(1);
      expect(notes[0]?.bodyAr).toContain('مستندات غير مكتملة');
    });
  });

  describe('WP-Admin-03: pending-only technician assignment', () => {
    it('assigns a verified technician to a pending request (audited + both notified)', async () => {
      const admin = auth('operations_admin');
      const res = await request(app.getHttpServer())
        .post(`/api/v1/admin/service-requests/${REQUEST_PENDING}/assign`)
        .set(admin)
        .send({ technician_id: TECH_PROFILE })
        .expect(200);
      expect(res.body.data).toMatchObject({ id: REQUEST_PENDING, technicianId: TECH_PROFILE });

      const row = prisma.serviceRequests.find((r) => r.id === REQUEST_PENDING);
      expect(row?.technicianId).toBe(TECH_PROFILE);
      expect(row?.status).toBe('pending');

      const audits = prisma.auditLogRows.filter(
        (a) => a.entityType === 'service_request' && a.action === 'admin.service_request.assign',
      );
      expect(audits).toHaveLength(1);
      expect(audits[0]?.afterJson).toMatchObject({ technicianId: TECH_PROFILE });
      expect(prisma.notificationRows.filter((n) => n.userId === 'tech-user-1')).toHaveLength(1);
      expect(prisma.notificationRows.filter((n) => n.userId === 'cust-1')).toHaveLength(1);
    });

    it('rejects non-pending requests, unverified technicians, and unknown ids', async () => {
      const admin = auth('operations_admin');
      await request(app.getHttpServer())
        .post(`/api/v1/admin/service-requests/${REQUEST_ACTIVE}/assign`)
        .set(admin)
        .send({ technician_id: TECH_PROFILE })
        .expect(409);

      const unverified = await request(app.getHttpServer())
        .post(`/api/v1/admin/service-requests/${REQUEST_PENDING}/assign`)
        .set(admin)
        .send({ technician_id: TECH_UNVERIFIED });
      expect(unverified.status).toBe(409);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/service-requests/${REQUEST_PENDING}/assign`)
        .set(admin)
        .send({ technician_id: '99999999-9999-4999-8999-999999999999' })
        .expect(404);

      await request(app.getHttpServer())
        .post('/api/v1/admin/service-requests/99999999-9999-4999-8999-999999999999/assign')
        .set(admin)
        .send({ technician_id: TECH_PROFILE })
        .expect(404);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/service-requests/${REQUEST_PENDING}/assign`)
        .set(admin)
        .send({ technician_id: 'not-a-uuid' })
        .expect(400);
    });
  });

  describe('WP-Admin-04: review removal requires a reason', () => {
    it('rejects removal without a reason; with reason it removes, audits, and recomputes metrics', async () => {
      const admin = auth('operations_admin');
      await request(app.getHttpServer())
        .post(`/api/v1/admin/reviews/${REVIEW_ID}/remove`)
        .set(admin)
        .send({})
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/admin/reviews/${REVIEW_ID}/remove`)
        .set(admin)
        .send({ reason: 'محتوى مسيء حسب سياسة المنصة' })
        .expect(200);

      expect(prisma.reviewRows.find((r) => r.id === REVIEW_ID)).toBeUndefined();
      const tech = prisma.technicianProfiles.find((t) => t.id === TECH_PROFILE);
      expect(tech?.ratingCount).toBe(0);
      expect(tech?.ratingAverage).toBeNull();

      const audits = prisma.auditLogRows.filter(
        (a) => a.entityType === 'review' && a.action === 'admin.review.remove',
      );
      expect(audits).toHaveLength(1);
      expect(audits[0]?.afterJson).toMatchObject({
        removed: true,
        reason: 'محتوى مسيء حسب سياسة المنصة',
      });
    });

    it('support_admin can remove with reason; content_admin cannot verify technicians', async () => {
      const support = auth('support_admin');
      await request(app.getHttpServer())
        .post(`/api/v1/admin/reviews/${REVIEW_ID}/remove`)
        .set(support)
        .send({ reason: 'محتوى مسيء' })
        .expect(200);

      const content = auth('content_admin');
      await request(app.getHttpServer())
        .post(`/api/v1/admin/technicians/${TECH_PROFILE}/verification`)
        .set(content)
        .send({ status: 'verified' })
        .expect(401);
    });
  });
});
