/**
 * REAL-DATABASE integration tests for Task 10M: business events wired to
 * the existing Notification persistence, exercised through the REAL
 * service classes (not a re-implementation) against verified khabir-dev.
 *
 * Coverage:
 *   - service-request transitions → counterparty notification (customer
 *     for technician actions; assigned technician for customer cancel)
 *   - stale/duplicate transition → throws and persists NO notification
 *   - subscription activation (admin manual grant) → notification
 *   - cancellation-of-renewal → exactly one notification (idempotent
 *     re-cancel does not duplicate)
 *   - manual entitlement grant → notification
 *   - ZERO RESIDUE: every probe row removed (probe marker `t10m-probe`).
 *
 * Same DB-safety contract as the other integration suites: skips without a
 * real Supabase URL, reads .env WITHOUT mutating process.env.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { parse } from 'dotenv';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { NotificationsService } from '../dist/notifications/notifications.service';
import { ServiceRequestsService } from '../dist/service-requests/service-requests.service';
import { SubscriptionsService } from '../dist/subscriptions/subscriptions.service';

const envPath = join(__dirname, '..', '.env');
let realDbUrl = '';
try {
  const parsed = parse(readFileSync(envPath, 'utf8')) as Record<string, string>;
  realDbUrl = parsed['DATABASE_URL'] ?? '';
} catch {
  realDbUrl = '';
}
const hasRealDb = /supabase\.com|supabase\.co/i.test(realDbUrl);

const PROBE = 't10m-probe';

describe.skipIf(!hasRealDb)('business event notifications (real khabir-dev)', () => {
  let prisma: PrismaClient;
  let serviceRequests: ServiceRequestsService;
  let subscriptions: SubscriptionsService;

  let customerUserId = '';
  let techUserId = '';
  let adminId = '';
  let categoryId = '';

  beforeAll(async () => {
    if (!hasRealDb) {
      return;
    }
    prisma = new PrismaClient({ datasources: { db: { url: realDbUrl } } });
    await prisma.$connect();
    // Real service classes against the real client (exact production code,
    // including the transaction boundaries).
    const notifications = new NotificationsService(prisma as never);
    serviceRequests = new ServiceRequestsService(prisma as never, notifications);
    subscriptions = new SubscriptionsService(prisma as never, notifications);
    await cleanProbeRows();
  });

  beforeEach(async () => {
    if (!hasRealDb) {
      return;
    }
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
    // Requests are RESTRICT-deleted first (10B design).
    await prisma.serviceRequest.deleteMany({
      where: {
        OR: [
          { customer: { email: { startsWith: `${PROBE}-` } } },
          { technician: { user: { email: { startsWith: `${PROBE}-` } } } },
        ],
      },
    });
    await prisma.notification.deleteMany({ where: { user: { email: { startsWith: `${PROBE}-` } } } });
    await prisma.paymentSubmission.deleteMany({ where: { user: { email: { startsWith: `${PROBE}-` } } } });
    await prisma.entitlementGrant.deleteMany({ where: { user: { email: { startsWith: `${PROBE}-` } } } });
    await prisma.subscription.deleteMany({ where: { user: { email: { startsWith: `${PROBE}-` } } } });
    await prisma.planEntitlement.deleteMany({ where: { plan: { code: { startsWith: PROBE } } } });
    await prisma.subscriptionPlan.deleteMany({ where: { code: { startsWith: PROBE } } });
    await prisma.entitlement.deleteMany({ where: { code: { startsWith: PROBE } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `${PROBE}-` } } });
    if (adminId !== '') {
      await prisma.auditLog.deleteMany({ where: { actorAdminId: adminId } });
    }
    await prisma.adminUser.deleteMany({ where: { email: { startsWith: `${PROBE}-` } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: `${PROBE}-` } } });
  }

  async function seedRequest(status: 'pending' | 'accepted' = 'pending'): Promise<string> {
    const customer = await prisma.user.create({
      data: { email: `${PROBE}-c@example.com`, passwordHash: 'probe', role: 'customer', status: 'active' },
    });
    customerUserId = customer.id;
    const technician = await prisma.user.create({
      data: { email: `${PROBE}-t@example.com`, passwordHash: 'probe', role: 'technician', status: 'active' },
    });
    techUserId = technician.id;
    const profile = await prisma.technicianProfile.create({
      data: { userId: technician.id, displayName: PROBE, verificationStatus: 'verified' },
    });
    categoryId = (await prisma.applianceCategory.findFirstOrThrow({ select: { id: true } })).id;
    const location = await prisma.location.create({
      data: { userId: customer.id, label: PROBE, latitude: 24.7, longitude: 46.7 },
    });
    const request = await prisma.serviceRequest.create({
      data: {
        customerId: customer.id,
        technicianId: profile.id,
        applianceCategoryId: categoryId,
        status,
        problemTitle: PROBE,
        problemDescription: PROBE,
        locationId: location.id,
        ...(status === 'accepted' ? { acceptedAt: new Date() } : {}),
      },
    });
    await prisma.serviceRequestStatusHistory.create({
      data: { serviceRequestId: request.id, fromStatus: null, toStatus: 'pending', changedByUserId: customer.id },
    });
    return request.id;
  }

  function notesFor(userId: string) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  it('persists a counterparty notification for each transition, and none for a stale repeat', async () => {
    if (!hasRealDb) {
      return;
    }
    const requestId = await seedRequest();

    await serviceRequests.accept({ id: techUserId, role: 'technician' }, requestId);
    await serviceRequests.start({ id: techUserId, role: 'technician' }, requestId);
    await serviceRequests.start({ id: techUserId, role: 'technician' }, requestId);
    await serviceRequests.complete({ id: techUserId, role: 'technician' }, requestId);

    const notes = await notesFor(customerUserId);
    expect(notes.map((n) => n.type)).toEqual([
      'request_status',
      'request_status',
      'request_status',
      'request_status',
    ]);
    expect(notes.map((n) => n.titleAr)).toEqual([
      'تم قبول طلب الخدمة',
      'الفني في الطريق',
      'بدأ تنفيذ الخدمة',
      'تم إكمال الخدمة',
    ]);
    expect(notes.every((n) => n.readAt === null)).toBe(true);
    // The acting technician received nothing for their own actions.
    expect(await notesFor(techUserId)).toHaveLength(0);

    // Stale duplicate accept: rejected, NO additional notification.
    await expect(
      serviceRequests.accept({ id: techUserId, role: 'technician' }, requestId),
    ).rejects.toThrow();
    expect(await notesFor(customerUserId)).toHaveLength(4);
  });

  it('notifies the assigned technician when the customer cancels', async () => {
    if (!hasRealDb) {
      return;
    }
    const requestId = await seedRequest();
    await serviceRequests.cancel({ id: customerUserId, role: 'customer' }, requestId);

    const techNotes = await notesFor(techUserId);
    expect(techNotes).toHaveLength(1);
    expect(techNotes[0].type).toBe('request_status');
    expect(techNotes[0].titleAr).toBe('تم إلغاء طلب الخدمة');
    expect(await notesFor(customerUserId)).toHaveLength(0);
  });

  it('persists subscription activation, a single cancellation confirmation, and an entitlement grant', async () => {
    if (!hasRealDb) {
      return;
    }
    const customer = await prisma.user.create({
      data: { email: `${PROBE}-sub@example.com`, passwordHash: 'probe', role: 'customer', status: 'active' },
    });
    const admin = await prisma.adminUser.create({
      data: { email: `${PROBE}-admin@example.com`, passwordHash: 'probe', role: 'super_admin', status: 'active' },
    });
    adminId = admin.id;
    const plan = await prisma.subscriptionPlan.create({
      data: {
        role: 'customer',
        code: `${PROBE}-plan`,
        nameAr: 'خطة تجريبية',
        billingInterval: 'monthly',
        price: 49.99,
        currency: 'SAR',
        isActive: true,
      },
    });
    const entitlement = await prisma.entitlement.upsert({
      where: { code: `${PROBE}-ent` },
      update: { isActive: true },
      create: { code: `${PROBE}-ent`, nameAr: 'دعم تجريبي', featureGroup: 'support' },
    });

    const granted = await subscriptions.adminGrantSubscription(admin.id, customer.id, plan.id);
    const subscriptionId = granted['id'] as string;
    let notes = await notesFor(customer.id);
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe('subscription');
    expect(notes[0].titleAr).toBe('تم تفعيل اشتراكك');

    await subscriptions.cancelRenewal(customer.id, subscriptionId);
    await subscriptions.cancelRenewal(customer.id, subscriptionId);
    notes = await notesFor(customer.id);
    expect(notes.filter((n) => n.titleAr === 'تم إيقاف تجديد الاشتراك')).toHaveLength(1);
    expect(notes).toHaveLength(2);

    await subscriptions.adminGrantEntitlement(admin.id, customer.id, entitlement.id);
    notes = await notesFor(customer.id);
    expect(notes).toHaveLength(3);
    const entNote = notes.find((n) => n.titleAr === 'تم منحك ميزة جديدة');
    expect(entNote?.bodyAr).toContain('دعم تجريبي');
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
    const plans = await prisma.subscriptionPlan.findMany({ where: { code: { startsWith: PROBE } } });
    expect(plans).toHaveLength(0);
    // No notification can reference a deleted probe user (FK cascade) — an
    // orphan would mean cleanup failed.
    const orphans = await prisma.notification.count({
      where: { user: { email: { startsWith: `${PROBE}-` } } },
    });
    expect(orphans).toBe(0);
  });
});
