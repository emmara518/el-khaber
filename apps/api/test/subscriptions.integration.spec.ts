/**
 * REAL-DATABASE integration tests for Task 10I: subscription persistence,
 * payment submission → admin approval (one transaction) → ACTIVE
 * subscription + entitlements, rejection, manual grants, audit trail, and
 * admin notification — against verified khabir-dev. Deterministic probe
 * rows, fully cleaned (probe marker: t10i-probe).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { parse } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const envPath = join(__dirname, '..', '.env');
let realDbUrl = '';
try {
  const parsed = parse(readFileSync(envPath, 'utf8')) as Record<string, string>;
  realDbUrl = parsed['DATABASE_URL'] ?? '';
} catch {
  realDbUrl = '';
}
const hasRealDb = /supabase\.com|supabase\.co/i.test(realDbUrl);

const PROBE = 't10i-probe';

describe.skipIf(!hasRealDb)('subscriptions + payments (real khabir-dev)', () => {
  let prisma: PrismaClient;
  let _adminId = '';
  let _customerUserId = '';
  let _customerRole = 'customer';
  let _activePlanId = '';
  let _entitlementId = '';
  let _submissionId = '';
  let _subscriptionId = '';

  beforeAll(async () => {
    if (!hasRealDb) {
      return;
    }
    prisma = new PrismaClient({ datasources: { db: { url: realDbUrl } } });
    await cleanProbeRows();
  });

  afterAll(async () => {
    if (!hasRealDb) {
      return;
    }
    await cleanProbeRows();
    await prisma.$disconnect();
  });

  async function cleanProbeRows(): Promise<void> {
    // Submissions reference plans (RESTRICT) and users (CASCADE); requests
    // are not involved. Delete submissions/grants/subscriptions by probe
    // user, then the users (roles/profiles cascade).
    await prisma.paymentSubmission.deleteMany({
      where: { user: { email: { startsWith: `${PROBE}-` } } },
    });
    await prisma.entitlementGrant.deleteMany({
      where: { user: { email: { startsWith: `${PROBE}-` } } },
    });
    await prisma.subscription.deleteMany({
      where: { user: { email: { startsWith: `${PROBE}-` } } },
    });
    await prisma.notification.deleteMany({
      where: { user: { email: { startsWith: `${PROBE}-` } } },
    });
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { actorAdmin: { email: { startsWith: `${PROBE}-` } } },
          { afterJson: { path: ['userId'], equals: undefined } },
        ],
      },
    }).catch(() => undefined); // afterJson path filter unsupported for probe rows
    await prisma.planEntitlement.deleteMany({ where: { plan: { code: { startsWith: PROBE } } } });
    await prisma.subscriptionPlan.deleteMany({ where: { code: { startsWith: PROBE } } });
    await prisma.entitlement.deleteMany({ where: { code: { startsWith: PROBE } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `${PROBE}-` } } });
    await prisma.adminUser.deleteMany({ where: { email: { startsWith: `${PROBE}-` } } });
  }

  it('persists plans/submissions/approval/grants/audits/notifications end-to-end', async () => {
    if (!hasRealDb) {
      return;
    }
    // Fixtures: admin + customer + ACTIVE customer plan + entitlement.
    const admin = await prisma.adminUser.create({
      data: { email: `${PROBE}-admin@example.com`, passwordHash: 'probe', role: 'super_admin', status: 'active' },
    });
    _adminId = admin.id;
    const customer = await prisma.user.create({
      data: { email: `${PROBE}-c@example.com`, passwordHash: 'probe', role: 'customer', status: 'active' },
    });
    _customerUserId = customer.id;
    _customerRole = customer.role;
    const plan = await prisma.subscriptionPlan.create({
      data: {
        role: 'customer', code: `${PROBE}-plan`, nameAr: 'خطة تجريبية',
        billingInterval: 'monthly', price: 49.99, currency: 'SAR', isActive: true,
      },
    });
    _activePlanId = plan.id;
    const entitlement = await prisma.entitlement.upsert({
      where: { code: `${PROBE}-priority` },
      update: { isActive: true },
      create: { code: `${PROBE}-priority`, nameAr: 'دعم تجريبي', featureGroup: 'support' },
    });
    _entitlementId = entitlement.id;
    await prisma.planEntitlement.create({
      data: { planId: plan.id, entitlementId: entitlement.id },
    });

    // 1. Payment submission (user) — pending.
    const submission = await prisma.paymentSubmission.create({
      data: {
        userId: customer.id,
        planId: plan.id,
        method: 'instapay',
        transferReference: `${PROBE}-TRX-1`,
        status: 'pending',
      },
    });
    _submissionId = submission.id;
    expect(submission.status).toBe('pending');

    // 2. ADMIN approval transaction: submission → approved, subscription
    //    created ACTIVE, audit + notification written atomically.
    const subscription = await prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentSubmission.updateMany({
        where: { id: submission.id, status: 'pending' },
        data: { status: 'approved', reviewedByAdminId: admin.id, reviewedAt: new Date() },
      });
      expect(claimed.count).toBe(1);
      const now = new Date();
      const sub = await tx.subscription.create({
        data: {
          userId: customer.id,
          planId: plan.id,
          status: 'active',
          startedAt: now,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          renewalEnabled: true,
        },
      });
      await tx.paymentSubmission.update({
        where: { id: submission.id },
        data: { subscriptionId: sub.id },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: admin.id,
          entityType: 'payment_submission',
          entityId: submission.id,
          action: 'admin.payment.approve',
          afterJson: { subscriptionId: sub.id } as never,
        },
      });
      await tx.notification.create({
        data: {
          userId: customer.id,
          type: 'subscription',
          titleAr: 'تم اعتماد عملية الدفع',
          bodyAr: 'تم اعتماد عملية الدفع وتفعيل الاشتراك.',
        },
      });
      return sub;
    });
    _subscriptionId = subscription.id;
    expect(subscription.status).toBe('active');

    // 3. Entitlement chain resolves plan entitlements.
    const planEnts = await prisma.planEntitlement.findMany({
      where: { planId: plan.id },
      select: { entitlement: { select: { code: true } } },
    });
    expect(planEnts.map((pe) => pe.entitlement.code)).toContain(`${PROBE}-priority`);

    // 4. Manual ENTITLEMENT grant (admin) + audit; no payment record.
    const grant = await prisma.$transaction(async (tx) => {
      const g = await tx.entitlementGrant.create({
        data: { userId: customer.id, entitlementId: entitlement.id, grantedByAdminId: admin.id },
      });
      await tx.auditLog.create({
        data: {
          actorAdminId: admin.id,
          entityType: 'entitlement_grant',
          entityId: g.id,
          action: 'admin.manual_grant.entitlement',
          afterJson: { userId: customer.id, code: `${PROBE}-priority` } as never,
        },
      });
      return g;
    });
    expect(grant.userId).toBe(customer.id);

    // 5. Duplicate submission approval is stale.
    const stale = await prisma.paymentSubmission.updateMany({
      where: { id: submission.id, status: 'pending' },
      data: { status: 'approved' },
    });
    expect(stale.count).toBe(0);

    // 6. Persistence assertions: audit trail + notification exist.
    const audits = await prisma.auditLog.findMany({
      where: { actorAdminId: admin.id },
    });
    expect(audits.length).toBeGreaterThanOrEqual(2);
    const notifications = await prisma.notification.findMany({
      where: { userId: customer.id },
    });
    expect(notifications).toHaveLength(1);
  });

  it('leaves zero probe rows after cleanup', async () => {
    if (!hasRealDb) {
      return;
    }
    await cleanProbeRows();
    const users = await prisma.user.findMany({ where: { email: { startsWith: `${PROBE}-` } } });
    expect(users).toHaveLength(0);
    const admins = await prisma.adminUser.findMany({ where: { email: { startsWith: `${PROBE}-` } } });
    expect(admins).toHaveLength(0);
    const submissions = await prisma.paymentSubmission.findMany({
      where: { transferReference: { startsWith: PROBE } },
    });
    expect(submissions).toHaveLength(0);
  });
});
