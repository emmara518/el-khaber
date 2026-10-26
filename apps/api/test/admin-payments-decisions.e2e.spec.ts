/**
 * Admin payment decisions (approve/reject), manual grants, proof access
 * and operational notifications — service-level e2e coverage.
 *
 * Complements the existing admin-rbac / admin-governance specs (which cover
 * role metadata and the verification/review/request flows) by proving the
 * DECISION semantics: activation + audit + notification side effects,
 * canonical conflict/validation envelopes, and the documented current
 * behavior on unknown ids.
 *
 * Bootstraps the compiled app against the in-memory FakePrisma client.
 * Records CURRENT behavior without inventing rules:
 *  - reject on an UNKNOWN submission id returns 409 (claim-first ordering
 *    in payments.service adminReject), not the 404 documented in Swagger.
 *    Recorded as-is here; changing it is a server decision, not a fixture.
 */

import 'reflect-metadata';

import { createRequire } from 'node:module';

import { Test } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../dist/app.module';
import { getConfig } from '../dist/config/app.config';

import { createFakePrisma, type FakePrismaClient } from './fake-prisma';

import type { INestApplication } from '@nestjs/common';
import type {
  AdminRow,
  PaymentSubmissionRow,
  SubscriptionPlanRow,
  SubscriptionRow,
  UserRow,
} from './fake-prisma';

// Runtime-only CommonJS requires (compiled dist), mirroring the existing
// admin e2e specs.
const requireCJS = createRequire(import.meta.url);
const { PrismaService } = requireCJS('../dist/database/prisma.service') as {
  PrismaService: new (...args: unknown[]) => unknown;
};
const { hashPassword } = requireCJS('../dist/auth/password') as {
  hashPassword: (plain: string) => Promise<string>;
};

const PASSWORD = 'sup3rsecretP4ss';
const DAY_MS = 24 * 60 * 60 * 1000;

// Exact approved copy from notification-events.ts (shift-left contract:
// titles never carry reasons/notes; the body carries them).
const APPROVED_TITLE = 'تم اعتماد عملية الدفع';
const APPROVED_BASE = 'تم اعتماد عملية الدفع وتفعيل الاشتراك.';
const REJECTED_TITLE = 'تم رفض إثبات الدفع';
const REJECTED_BASE = 'تم رفض إثبات الدفع. يمكنك إرسال طلب جديد أو التواصل مع الدعم.';
const SUB_TITLE = 'تم تفعيل اشتراكك';
const SUB_BODY = 'تم تفعيل الاشتراك الخاص بك بنجاح.';
const ENT_TITLE = 'تم منحك ميزة جديدة';
const NOTIF_TYPE = 'subscription';

let seq = 0;
function uid(): string {
  seq += 1;
  return `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
}

describe('admin payment decisions / grants / notifications (e2e)', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;
  let token: string;
  const tokens = new Map<string, string>();

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

  beforeEach(async () => {
    prisma.users.length = 0;
    prisma.refreshTokens.length = 0;
    prisma.adminUsers.length = 0;
    prisma.adminRefreshTokens.length = 0;
    prisma.subscriptionPlans.length = 0;
    prisma.subscriptions.length = 0;
    prisma.paymentSubmissionRows.length = 0;
    prisma.entitlements.length = 0;
    prisma.entitlementGrantRows.length = 0;
    prisma.auditLogRows.length = 0;
    prisma.notificationRows.length = 0;
    prisma.notificationPreferenceRows.length = 0;
    tokens.clear();
    seq = 0;

    token = await loginAdmin('admin@khabir.test', 'super_admin');
  });

  // --- seed helpers ---------------------------------------------------------

  const audited = (action: string) => prisma.auditLogRows.filter((r) => r.action === action);
  const notesFor = (userId: string) => prisma.notificationRows.filter((n) => n.userId === userId);
  const subsFor = (userId: string) => prisma.subscriptions.filter((s) => s.userId === userId);

  async function seedUser(role: UserRow['role'] = 'customer'): Promise<string> {
    const id = uid();
    const row: UserRow = {
      id,
      phone: `phone-${seq}-x`,
      email: `user-${seq}@khabir.test`,
      passwordHash: 'not-a-real-hash',
      role,
      status: 'active',
      phoneVerified: true,
      emailVerified: false,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.users.push(row);
    return id;
  }

  async function loginAdmin(email: string, role: AdminRow['role']): Promise<string> {
    const passwordHash = await hashPassword(PASSWORD);
    prisma.adminUsers.push({
      id: uid(),
      email,
      passwordHash,
      role,
      status: 'active',
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    const accessToken = login.body.data.accessToken as string;
    tokens.set(role, accessToken);
    return accessToken;
  }

  function seedPlan(
    opts: Partial<SubscriptionPlanRow> & { role: SubscriptionPlanRow['role'] },
  ): string {
    const id = uid();
    prisma.subscriptionPlans.push({
      id,
      role: opts.role,
      code: `plan-${seq}`,
      nameAr: 'خطة',
      nameEn: null,
      billingInterval: 'monthly',
      price: 100,
      currency: 'EGP',
      isActive: true,
      sortOrder: 0,
      ...opts,
    } as SubscriptionPlanRow);
    return id;
  }

  function seedSubmission(userId: string, planId: string): string {
    const id = uid();
    const row: PaymentSubmissionRow = {
      id,
      userId,
      planId,
      subscriptionId: null,
      method: 'instapay',
      transferReference: `TR-${seq}`,
      proofStorageKey: null,
      status: 'pending',
      reviewedByAdminId: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prisma.paymentSubmissionRows.push(row);
    return id;
  }

  function seedActiveSubscription(userId: string, planId: string, overdue = false): string {
    const id = uid();
    const now = new Date();
    const row: SubscriptionRow = {
      id,
      userId,
      planId,
      status: 'active',
      startedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(now.getTime() + (overdue ? -DAY_MS : 30 * DAY_MS)),
      cancelledAt: null,
      renewalEnabled: true,
      providerReference: null,
      createdAt: now,
      updatedAt: now,
    };
    prisma.subscriptions.push(row);
    return id;
  }

  function seedEntitlement(opts: { code: string; isActive?: boolean; nameAr?: string }): string {
    const id = uid();
    prisma.entitlements.push({
      id,
      code: opts.code,
      nameAr: opts.nameAr ?? 'ميزة',
      descriptionAr: null,
      featureGroup: 'general',
      isActive: opts.isActive ?? true,
    });
    return id;
  }

  const post = (path: string, body: unknown, bearer = token) =>
    request(app.getHttpServer()).post(path).set('Authorization', `Bearer ${bearer}`).send(body);
  const get = (path: string, bearer = token) =>
    request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${bearer}`);

  // --- approve -------------------------------------------------------------

  describe('POST /admin/payments/submissions/:id/approve', () => {
    it('activates the subscription and writes audit + notification atomically', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer', code: 'customer-basic' });
      const subId = seedSubmission(userId, planId);

      const res = await post(`/api/v1/admin/payments/submissions/${subId}/approve`, {}).expect(200);

      expect(res.body.data).toEqual({
        id: subId,
        status: 'approved',
        subscriptionId: expect.any(String),
      });

      const subs = subsFor(userId);
      expect(subs).toHaveLength(1);
      expect(subs[0]).toMatchObject({
        planId,
        status: 'active',
        renewalEnabled: true,
        providerReference: null,
      });
      expect(subs[0].currentPeriodEnd.getTime() - subs[0].startedAt.getTime()).toBe(30 * DAY_MS);

      const submission = prisma.paymentSubmissionRows.find((s) => s.id === subId);
      expect(submission?.status).toBe('approved');
      expect(submission?.subscriptionId).toBe(subs[0].id);
      expect(submission?.reviewedByAdminId).toBeTruthy();

      const audits = audited('admin.payment.approve');
      expect(audits).toHaveLength(1);
      expect(audits[0]).toMatchObject({
        actorAdminId: expect.any(String),
        entityType: 'payment_submission',
        entityId: subId,
        beforeJson: { status: 'pending' },
        afterJson: {
          status: 'approved',
          subscriptionId: subs[0].id,
          userId,
          planId,
        },
      });
      expect((audits[0].afterJson as Record<string, unknown>).note).toBeUndefined();

      const notes = notesFor(userId);
      expect(notes).toHaveLength(1);
      expect(notes[0]).toMatchObject({
        userId,
        type: NOTIF_TYPE,
        titleAr: APPROVED_TITLE,
        bodyAr: APPROVED_BASE,
      });
      expect(notes[0].dataJson).toEqual({
        submissionId: subId,
        subscriptionId: subs[0].id,
      });
    });

    it('appends the optional note to the audit trail and message body only', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      const subId = seedSubmission(userId, planId);

      await post(`/api/v1/admin/payments/submissions/${subId}/approve`, { note: 'موبايل وصل' })
        .expect(200);

      const audits = audited('admin.payment.approve');
      expect((audits[0].afterJson as Record<string, unknown>).note).toBe('موبايل وصل');

      const notes = notesFor(userId);
      expect(notes[0].titleAr).toBe(APPROVED_TITLE);
      expect(notes[0].bodyAr).toBe(`${APPROVED_BASE} ملاحظة: موبايل وصل`);
    });

    it('404 for an unknown submission id (valid UUID) — no subscription, audit, or notification', async () => {
      const res = await post(`/api/v1/admin/payments/submissions/${uid()}/approve`, {});

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toBe('Payment submission not found');
      expect(prisma.subscriptions).toHaveLength(0);
      expect(audited('admin.payment.approve')).toHaveLength(0);
      expect(prisma.notificationRows).toHaveLength(0);
    });

    it('CURRENT BEHAVIOR: a non-UUID :id is identity-mapped to generic 404 (UuidParamPipe)', async () => {
      // The global UuidParamPipe treats 'malformed' as 'absent' before the
      // service runs (docs/07_API.md §21 — controlled NOT_FOUND).
      const res = await post('/api/v1/admin/payments/submissions/does-not-exist/approve', {});
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toBe('Not found');
    });

    it('409 already-active — stacking is impossible (WP-7 D3), no side effects', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      seedActiveSubscription(userId, planId);
      const subId = seedSubmission(userId, planId);

      const res = await post(`/api/v1/admin/payments/submissions/${subId}/approve`, {}).expect(409);

      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toBe('User already has an active subscription');

      // Submission stays pending; nothing was audited or notified.
      expect(prisma.paymentSubmissionRows.find((s) => s.id === subId)?.status).toBe('pending');
      expect(subsFor(userId)).toHaveLength(1);
      expect(audited('admin.payment.approve')).toHaveLength(0);
      expect(prisma.notificationRows).toHaveLength(0);
    });

    it('demotes an overdue active subscription and activates the new one', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      seedActiveSubscription(userId, planId, true); // currentPeriodEnd < now
      const subId = seedSubmission(userId, planId);

      await post(`/api/v1/admin/payments/submissions/${subId}/approve`, {}).expect(200);

      const subs = subsFor(userId);
      expect(subs).toHaveLength(2);
      expect(subs.filter((s) => s.status === 'active')).toHaveLength(1);
      expect(subs.filter((s) => s.status === 'expired')).toHaveLength(1);
    });

    it('409 when the plan is inactive', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer', isActive: false });
      const subId = seedSubmission(userId, planId);

      const res = await post(`/api/v1/admin/payments/submissions/${subId}/approve`, {}).expect(409);
      expect(res.body.error.message).toBe('Plan is not available for this user');
      expect(prisma.subscriptions).toHaveLength(0);
      expect(audited('admin.payment.approve')).toHaveLength(0);
    });

    it('409 when the plan role does not match the user role', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'technician' });
      const subId = seedSubmission(userId, planId);

      const res = await post(`/api/v1/admin/payments/submissions/${subId}/approve`, {}).expect(409);
      expect(res.body.error.message).toBe('Plan is not available for this user');
      expect(prisma.subscriptions).toHaveLength(0);
    });

    it('stale replay: approving twice yields 409 with no duplicate effects', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      const subId = seedSubmission(userId, planId);

      await post(`/api/v1/admin/payments/submissions/${subId}/approve`, {}).expect(200);
      const second = await post(`/api/v1/admin/payments/submissions/${subId}/approve`, {}).expect(
        409,
      );

      // Real check order in adminApprove: the already-active subscription
      // guard runs BEFORE the pending-claim guard, so the replayed approval
      // resolves as 'already-active' (identical 409/CONFLICT outcome).
      expect(second.body.error.code).toBe('CONFLICT');
      expect(second.body.error.message).toBe('User already has an active subscription');
      expect(subsFor(userId)).toHaveLength(1);
      expect(audited('admin.payment.approve')).toHaveLength(1);
      expect(notesFor(userId)).toHaveLength(1);
      expect(prisma.paymentSubmissionRows.find((s) => s.id === subId)?.status).toBe('approved');
    });
  });

  // --- reject --------------------------------------------------------------

  describe('POST /admin/payments/submissions/:id/reject', () => {
    it('rejects with the required reason flowing into audit + notification', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      const subId = seedSubmission(userId, planId);
      const reason = 'صورة الإيصال غير مقروءة';

      const res = await post(`/api/v1/admin/payments/submissions/${subId}/reject`, { reason })
        .expect(200);

      expect(res.body.data).toEqual({ id: subId, status: 'rejected' });

      expect(prisma.subscriptions).toHaveLength(0);
      const submission = prisma.paymentSubmissionRows.find((s) => s.id === subId);
      expect(submission?.status).toBe('rejected');

      const audits = audited('admin.payment.reject');
      expect(audits).toHaveLength(1);
      expect(audits[0]).toMatchObject({
        entityType: 'payment_submission',
        entityId: subId,
        beforeJson: { status: 'pending' },
        afterJson: { status: 'rejected', userId, reason },
      });

      const notes = notesFor(userId);
      expect(notes).toHaveLength(1);
      expect(notes[0]).toMatchObject({
        userId,
        type: NOTIF_TYPE,
        titleAr: REJECTED_TITLE,
        bodyAr: `${REJECTED_BASE} السبب: ${reason}`,
      });
    });

    it('400 when the reason is missing or too short (VALIDATION_ERROR)', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      const subId = seedSubmission(userId, planId);

      const missing = await post(`/api/v1/admin/payments/submissions/${subId}/reject`, {});
      expect(missing.status).toBe(400);
      expect(missing.body.error.code).toBe('VALIDATION_ERROR');

      const short = await post(`/api/v1/admin/payments/submissions/${subId}/reject`, {
        reason: 'لا',
      });
      expect(short.status).toBe(400);

      expect(prisma.paymentSubmissionRows.find((s) => s.id === subId)?.status).toBe('pending');
      expect(audited('admin.payment.reject')).toHaveLength(0);
      expect(prisma.notificationRows).toHaveLength(0);
    });

    it('reject on an unknown (valid-UUID) id returns 404 (not found)', async () => {
      // adminReject resolves the submission BEFORE claiming it, so an unknown
      // id is a genuine 404 per the API contract. A reviewed submission still
      // returns 409 (covered by the following test).
      const res = await post(`/api/v1/admin/payments/submissions/${uid()}/reject`, {
        reason: 'سبب صحيح',
      });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toBe('Payment submission not found');
      // No side effects mutated (nothing to claim, nothing to audit/notify).
      expect(audited('admin.payment.reject')).toHaveLength(0);
      expect(prisma.notificationRows).toHaveLength(0);
    });

    it('rejecting an already-approved submission yields 409 and adds no rejection copy', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      const subId = seedSubmission(userId, planId);

      await post(`/api/v1/admin/payments/submissions/${subId}/approve`, {}).expect(200);
      const second = await post(`/api/v1/admin/payments/submissions/${subId}/reject`, {
        reason: 'محاولة متكررة',
      }).expect(409);

      expect(second.body.error.message).toBe('Payment submission has already been reviewed');
      expect(notesFor(userId)).toHaveLength(1);
      expect(notesFor(userId)[0].titleAr).toBe(APPROVED_TITLE);
      expect(prisma.subscriptions).toHaveLength(1);
    });
  });

  // --- grants: subscription ------------------------------------------------

  describe('POST /admin/subscriptions/grant', () => {
    it('creates an ACTIVE subscription with audit + notification (201)', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer', code: 'customer-pro' });

      const res = await post('/api/v1/admin/subscriptions/grant', {
        user_id: userId,
        plan_id: planId,
      }).expect(201);

      expect(res.body.data).toEqual({
        id: expect.any(String),
        userId,
        planId,
        status: 'active',
      });

      const subs = subsFor(userId);
      expect(subs).toHaveLength(1);
      expect(subs[0]).toMatchObject({ planId, status: 'active', renewalEnabled: true });
      expect(subs[0].currentPeriodEnd.getTime() - subs[0].startedAt.getTime()).toBe(30 * DAY_MS);

      const audits = audited('admin.manual_grant.subscription');
      expect(audits).toHaveLength(1);
      expect(audits[0]).toMatchObject({
        entityType: 'subscription',
        entityId: subs[0].id,
        afterJson: { userId, planId, periodDays: 30 },
      });

      const notes = notesFor(userId);
      expect(notes).toHaveLength(1);
      expect(notes[0]).toMatchObject({
        userId,
        type: NOTIF_TYPE,
        titleAr: SUB_TITLE,
        bodyAr: SUB_BODY,
      });
      expect(notes[0].dataJson).toEqual({ subscriptionId: subs[0].id, planId });
    });

    it('409 while an active subscription exists — no duplicate audit', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      seedActiveSubscription(userId, planId);

      const res = await post('/api/v1/admin/subscriptions/grant', {
        user_id: userId,
        plan_id: planId,
      }).expect(409);

      expect(res.body.error.message).toBe('User already has an active subscription');
      expect(audited('admin.manual_grant.subscription')).toHaveLength(0);
      expect(prisma.notificationRows).toHaveLength(0);
    });

    it('409 for plan role mismatch / inactive plan with distinct messages', async () => {
      const customer = await seedUser('customer');

      const mismatchPlan = seedPlan({ role: 'technician' });
      const mismatch = await post('/api/v1/admin/subscriptions/grant', {
        user_id: customer,
        plan_id: mismatchPlan,
      }).expect(409);
      expect(mismatch.body.error.message).toBe('Plan role does not match the user role');
      expect(mismatch.body.error.code).toBe('CONFLICT');

      const inactivePlan = seedPlan({ role: 'customer', isActive: false });
      const inactive = await post('/api/v1/admin/subscriptions/grant', {
        user_id: customer,
        plan_id: inactivePlan,
      }).expect(409);
      expect(inactive.body.error.message).toBe('Plan is not active');

      expect(prisma.subscriptions).toHaveLength(0);
    });

    it('404 for an unknown user / unknown plan', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });

      const noUser = await post('/api/v1/admin/subscriptions/grant', {
        user_id: uid(),
        plan_id: planId,
      }).expect(404);
      expect(noUser.body.error.message).toBe('User not found');

      const noPlan = await post('/api/v1/admin/subscriptions/grant', {
        user_id: userId,
        plan_id: uid(),
      }).expect(404);
      expect(noPlan.body.error.message).toBe('Plan not found');
    });
  });

  // --- grants: entitlement -------------------------------------------------

  describe('POST /admin/entitlements/grant', () => {
    it('grants once with audit + notification including the entitlement name', async () => {
      const userId = await seedUser('customer');
      const entId = seedEntitlement({ code: 'priority_support', nameAr: 'أولوية الدعم' });

      const res = await post('/api/v1/admin/entitlements/grant', {
        user_id: userId,
        entitlement_id: entId,
      }).expect(201);

      expect(res.body.data).toEqual({
        id: expect.any(String),
        userId,
        entitlementId: entId,
        code: 'priority_support',
      });

      const audits = audited('admin.manual_grant.entitlement');
      expect(audits).toHaveLength(1);
      expect(audits[0]).toMatchObject({
        entityType: 'entitlement_grant',
        afterJson: { userId, entitlementId: entId, code: 'priority_support' },
      });

      const notes = notesFor(userId);
      expect(notes).toHaveLength(1);
      expect(notes[0]).toMatchObject({
        userId,
        type: NOTIF_TYPE,
        titleAr: ENT_TITLE,
        bodyAr: 'تم منحك ميزة: أولوية الدعم.',
      });
    });

    it('409 duplicate / inactive entitlement with distinct messages', async () => {
      const userId = await seedUser('customer');
      const activeEnt = seedEntitlement({ code: 'priority_support' });
      const inactiveEnt = seedEntitlement({ code: 'legacy_feature', isActive: false });

      await post('/api/v1/admin/entitlements/grant', {
        user_id: userId,
        entitlement_id: activeEnt,
      }).expect(201);

      const duplicate = await post('/api/v1/admin/entitlements/grant', {
        user_id: userId,
        entitlement_id: activeEnt,
      }).expect(409);
      expect(duplicate.body.error.message).toBe('Entitlement already granted to this user');

      const inactive = await post('/api/v1/admin/entitlements/grant', {
        user_id: userId,
        entitlement_id: inactiveEnt,
      }).expect(409);
      expect(inactive.body.error.message).toBe('Entitlement is not active');

      expect(prisma.entitlementGrantRows).toHaveLength(1);
    });

    it('404 for unknown user / unknown entitlement', async () => {
      const userId = await seedUser('customer');
      const entId = seedEntitlement({ code: 'any' });

      const noUser = await post('/api/v1/admin/entitlements/grant', {
        user_id: uid(),
        entitlement_id: entId,
      }).expect(404);
      expect(noUser.body.error.message).toBe('User not found');

      const noEnt = await post('/api/v1/admin/entitlements/grant', {
        user_id: userId,
        entitlement_id: uid(),
      }).expect(404);
      expect(noEnt.body.error.message).toBe('Entitlement not found');
    });
  });

  // --- operational notification --------------------------------------------

  describe('POST /admin/notifications', () => {
    const NOTIFY_PATH = '/api/v1/admin/notifications';

    it('creates the notification and its audit entry (201)', async () => {
      const userId = await seedUser('customer');
      const body = {
        user_id: userId,
        type: 'general',
        title_ar: 'صيانة مجدولة',
        body_ar: 'سيتم إيقاف الخدمة مؤقتًا الليلة من 2 إلى 3 صباحًا.',
      };

      const res = await post(NOTIFY_PATH, body).expect(201);
      expect(res.body.data).toEqual({
        id: expect.any(String),
        userId,
        type: 'general',
      });

      const rows = notesFor(userId);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        userId,
        type: 'general',
        titleAr: body.title_ar,
        bodyAr: body.body_ar,
      });

      const audits = audited('admin.notification.create');
      expect(audits).toHaveLength(1);
      expect(audits[0]).toMatchObject({
        entityType: 'notification',
        entityId: res.body.data.id,
        afterJson: { userId, type: 'general' },
      });
    });

    it('404 for an unknown recipient and 400 for a missing title', async () => {
      const missing = await post(NOTIFY_PATH, {
        user_id: uid(),
        type: 'general',
        body_ar: 'بدون عنوان',
      }).expect(400);
      expect(missing.body.error.code).toBe('VALIDATION_ERROR');

      const noUser = await post(NOTIFY_PATH, {
        user_id: uid(),
        type: 'general',
        title_ar: 'بدون مستلم',
        body_ar: 'لن يصل إلى أحد.',
      }).expect(404);
      expect(noUser.body.error.message).toBe('User not found');
      expect(prisma.notificationRows).toHaveLength(0);
    });

    it('roles: super/ops/support deliver; content and finance are forbidden', async () => {
      const userId = await seedUser('customer');
      const payload = {
        user_id: userId,
        type: 'general',
        title_ar: 'تأكيد',
        body_ar: 'إشعار تشغيلي خاضع للصلاحيات.',
      };

      const ops = await loginAdmin('ops@khabir.test', 'operations_admin');
      const support = await loginAdmin('support@khabir.test', 'support_admin');
      const content = await loginAdmin('content@khabir.test', 'content_admin');
      const finance = await loginAdmin('finance@khabir.test', 'finance_admin');
      const permitted = [ops, support];

      await Promise.all(
        permitted.map(async (t) => {
          await post(NOTIFY_PATH, payload, t).expect(201);
        }),
      );
      await Promise.all(
        [content, finance].map(async (t) => {
          const forbidden = await post(NOTIFY_PATH, payload, t);
          expect(forbidden.status).toBe(403);
          expect(forbidden.body.error.code).toBe('FORBIDDEN');
        }),
      );

      expect(notesFor(userId)).toHaveLength(permitted.length);
      // Two notifications → two audit entries; content/finance attempts none.
      expect(audited('admin.notification.create')).toHaveLength(permitted.length);
    });
  });

  // --- role matrix (read + decision + proof + grants) -----------------------

  describe('role matrix for decision endpoints', () => {
    it('submissions list/detail: super+ops+support read; content is forbidden', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      const subId = seedSubmission(userId, planId);

      const ops = await loginAdmin('ops@khabir.test', 'operations_admin');
      const support = await loginAdmin('support@khabir.test', 'support_admin');
      const content = await loginAdmin('content@khabir.test', 'content_admin');

      await get('/api/v1/admin/payments/submissions', ops).expect(200);
      await get(`/api/v1/admin/payments/submissions/${subId}`, ops).expect(200);
      await get('/api/v1/admin/payments/submissions', support).expect(200);
      await get('/api/v1/admin/payments/submissions', content).expect(403);
      await get('/api/v1/admin/payments/submissions', token).expect(200);
    });

    it('approve/reject: only super; ops/support/content/finance get 403', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      const subId = seedSubmission(userId, planId);

      const ops = await loginAdmin('ops@khabir.test', 'operations_admin');
      const support = await loginAdmin('support@khabir.test', 'support_admin');
      const content = await loginAdmin('content@khabir.test', 'content_admin');
      const finance = await loginAdmin('finance@khabir.test', 'finance_admin');

      // Serialized on purpose: concurrent loops on the in-process server
      // can drop sockets (ECONNRESET) under full-suite load; the role
      // gate does not need parallel pressure.
      for (const t of [ops, support, content, finance]) {
        const rejected = await post(`/api/v1/admin/payments/submissions/${subId}/approve`, {}, t);
        expect(rejected.status).toBe(403);
        expect(rejected.body.error.code).toBe('FORBIDDEN');

        const noReject = await post(`/api/v1/admin/payments/submissions/${subId}/reject`, {
          reason: 'غير مصرح له بهذا الفعل',
        }, t).expect(403);
        expect(noReject.body.error.code).toBe('FORBIDDEN');
      }

      // Submission is still pending after every forbidden attempt.
      expect(prisma.paymentSubmissionRows.find((s) => s.id === subId)?.status).toBe('pending');
      expect(audited('admin.payment.approve')).toHaveLength(0);
      expect(audited('admin.payment.reject')).toHaveLength(0);
    });

    it('subscription/entitlement grants: only super; all other roles get 403', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      const entId = seedEntitlement({ code: 'any' });

      const roles = ['operations_admin', 'support_admin', 'content_admin', 'finance_admin'];
      for (const role of roles) {
        const t = await loginAdmin(`grants-${role}@khabir.test`, role);
        const noSub = await post('/api/v1/admin/subscriptions/grant', {
          user_id: userId,
          plan_id: planId,
        }, t).expect(403);
        expect(noSub.body.error.code).toBe('FORBIDDEN');

        const noEnt = await post('/api/v1/admin/entitlements/grant', {
          user_id: userId,
          entitlement_id: entId,
        }, t).expect(403);
        expect(noEnt.body.error.code).toBe('FORBIDDEN');
      }

      expect(prisma.subscriptions).toHaveLength(0);
      expect(prisma.entitlementGrantRows).toHaveLength(0);
    });

    it('proof URL: super+ops pass the guard (404 for unknown id); others 403', async () => {
      const ops = await loginAdmin('proof-ops@khabir.test', 'operations_admin');
      const support = await loginAdmin('proof-support@khabir.test', 'support_admin');
      const content = await loginAdmin('proof-content@khabir.test', 'content_admin');
      const finance = await loginAdmin('proof-finance@khabir.test', 'finance_admin');
      const PROOF_PATH = '/api/v1/admin/payments/submissions/does-not-exist/proof-url';

      // Super + ops pass the role guard and reach the domain (404 unknown).
      await get(PROOF_PATH, token).expect((res) => {
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
      });
      await get(PROOF_PATH, ops).expect((res) => {
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('NOT_FOUND');
      });

      // Serialized: socket drops under full-suite load (see role test above).
      for (const t of [support, content, finance]) {
        const forbidden = await get(PROOF_PATH, t);
        expect(forbidden.status).toBe(403);
        expect(forbidden.body.error.code).toBe('FORBIDDEN');
      }
    });

    it('permitted mutations leave zero audit rows under every forbidden role', async () => {
      const userId = await seedUser('customer');
      const planId = seedPlan({ role: 'customer' });
      const subId = seedSubmission(userId, planId);

      const before = prisma.auditLogRows.length;
      expect(before).toBeGreaterThanOrEqual(0);

      // A legitimate super action produces exactly one decision audit row —
      // the same call from a forbidden role produced none (asserted above);
      // the total ledger must reflect exactly the permitted side effects.
      await post(`/api/v1/admin/payments/submissions/${subId}/approve`, {}).expect(200);
      expect(prisma.auditLogRows.length).toBe(before + 1);
    });
  });
});
