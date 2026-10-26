/**
 * Real-HTTP E2E — admin review removal (Batch 2).
 *
 * Closes the review-removal gap for operations/support on the isolated
 * khabir_test database. Verifies the role matrix, that a refused caller
 * never deletes the review, the audit trail, and the derived technician
 * metrics after removal. Runs through the real guards + validation.
 */

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hashPassword } from '../../dist/auth/password';

import {
  PASSWORD,
  base,
  createHttpTestApp,
  resetDatabase,
  seedBaseline,
  type BaselineIds,
  type HttpTestContext,
  type TestPrisma,
} from './harness';

let ctx: HttpTestContext;
let baseline: BaselineIds;

type AdminRole = 'super_admin' | 'operations_admin' | 'content_admin' | 'support_admin';

const ADMIN_EMAILS: Record<AdminRole, string> = {
  super_admin: 'review-super@example.com',
  operations_admin: 'review-ops@example.com',
  content_admin: 'review-content@example.com',
  support_admin: 'review-support@example.com',
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

interface ReviewFixture {
  technicianId: string;
  reviewAId: string;
  reviewBId: string;
}

async function seedAdminWithRole(role: AdminRole, email: string): Promise<string> {
  const admin = await ctx.prisma.adminUser.create({
    data: {
      email,
      passwordHash: await hashPassword(PASSWORD),
      role,
      status: 'active',
    },
  });
  return admin.id;
}

async function loginAdmin(role: AdminRole): Promise<string> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/admin/auth/login`)
    .send({ email: ADMIN_EMAILS[role], password: PASSWORD })
    .expect(200);
  return res.body.data.accessToken as string;
}

async function seedTechnicianWithReviews(prisma: TestPrisma): Promise<ReviewFixture> {
  const passwordHash = await hashPassword(PASSWORD);
  const technician = await prisma.user.create({
    data: {
      email: 'review-tech@example.com',
      passwordHash,
      role: 'technician',
      technicianProfile: {
        create: { displayName: 'فني المراجعات', verificationStatus: 'verified' },
      },
    },
    include: { technicianProfile: true },
  });
  const technicianId = technician.technicianProfile?.id;
  if (technicianId === undefined) {
    throw new Error('technician profile missing');
  }

  const customer = await prisma.user.create({
    data: { email: 'review-customer@example.com', passwordHash, role: 'customer' },
  });
  const location = await prisma.location.create({
    data: { userId: customer.id, label: 'المنزل', city: 'القاهرة' },
  });

  const makeRequest = (description: string) =>
    prisma.serviceRequest.create({
      data: {
        customerId: customer.id,
        technicianId,
        applianceCategoryId: baseline.categoryId,
        locationId: location.id,
        problemDescription: description,
        status: 'completed',
        completedAt: new Date(),
      },
    });

  const [requestA, requestB] = await Promise.all([
    makeRequest('مراجعة أولى'),
    makeRequest('مراجعة ثانية'),
  ]);

  const [reviewA, reviewB] = await Promise.all([
    prisma.review.create({
      data: {
        serviceRequestId: requestA.id,
        customerId: customer.id,
        technicianId,
        rating: 5,
        comment: 'ممتاز',
      },
    }),
    prisma.review.create({
      data: {
        serviceRequestId: requestB.id,
        customerId: customer.id,
        technicianId,
        rating: 3,
        comment: 'مقبول',
      },
    }),
  ]);

  await prisma.technicianProfile.update({
    where: { id: technicianId },
    data: { ratingCount: 2, ratingAverage: 4 },
  });

  return { technicianId, reviewAId: reviewA.id, reviewBId: reviewB.id };
}

async function reviewExists(reviewId: string): Promise<boolean> {
  const row = await ctx.prisma.review.findUnique({ where: { id: reviewId } });
  return row !== null;
}

async function removalAuditCount(reviewId: string): Promise<number> {
  return ctx.prisma.auditLog.count({
    where: { action: 'admin.review.remove', entityId: reviewId },
  });
}

let fixture: ReviewFixture;
const tokens: Partial<Record<AdminRole, string>> = {};
const adminIds: Partial<Record<AdminRole, string>> = {};

beforeAll(async () => {
  ctx = await createHttpTestApp();
  await resetDatabase(ctx.prisma);
  baseline = await seedBaseline(ctx.prisma);
  fixture = await seedTechnicianWithReviews(ctx.prisma);
  for (const role of Object.keys(ADMIN_EMAILS) as AdminRole[]) {
    adminIds[role] = await seedAdminWithRole(role, ADMIN_EMAILS[role]);
    tokens[role] = await loginAdmin(role);
  }
});

afterAll(async () => {
  await ctx.close();
});

describe('HTTP E2E — admin review removal', () => {
  it('unauthenticated request → 401 and the review stays', async () => {
    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/reviews/${fixture.reviewAId}/remove`)
      .send({ reason: 'محتوى مخالف' })
      .expect(401);

    expect(await reviewExists(fixture.reviewAId)).toBe(true);
    expect(await removalAuditCount(fixture.reviewAId)).toBe(0);
  });

  it('operations_admin → 403, review NOT deleted, no audit entry', async () => {
    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/reviews/${fixture.reviewAId}/remove`)
      .set(auth(tokens.operations_admin ?? ''))
      .send({ reason: 'محاولة غير مصرح بها' })
      .expect(403);

    expect(await reviewExists(fixture.reviewAId)).toBe(true);
    expect(await removalAuditCount(fixture.reviewAId)).toBe(0);
  });

  it('support_admin → 403, review NOT deleted, no audit entry', async () => {
    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/reviews/${fixture.reviewAId}/remove`)
      .set(auth(tokens.support_admin ?? ''))
      .send({ reason: 'محاولة غير مصرح بها' })
      .expect(403);

    expect(await reviewExists(fixture.reviewAId)).toBe(true);
    expect(await removalAuditCount(fixture.reviewAId)).toBe(0);
  });

  it('super_admin with a too-short reason → 400 and the review stays', async () => {
    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/reviews/${fixture.reviewAId}/remove`)
      .set(auth(tokens.super_admin ?? ''))
      .send({ reason: 'x' })
      .expect(400);

    expect(await reviewExists(fixture.reviewAId)).toBe(true);
    expect(await removalAuditCount(fixture.reviewAId)).toBe(0);
  });

  it('super_admin → deletes, audits, and recomputes technician metrics', async () => {
    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/reviews/${fixture.reviewAId}/remove`)
      .set(auth(tokens.super_admin ?? ''))
      .send({ reason: 'مراجعة مسيئة ومخالفة للسياسة' })
      .expect(200);

    expect(await reviewExists(fixture.reviewAId)).toBe(false);

    const audit = await ctx.prisma.auditLog.findMany({
      where: { action: 'admin.review.remove', entityId: fixture.reviewAId },
    });
    expect(audit).toHaveLength(1);
    expect(audit[0]?.actorAdminId).toBe(adminIds.super_admin);
    expect(audit[0]?.beforeJson).toMatchObject({ rating: 5 });
    expect(audit[0]?.afterJson).toMatchObject({
      removed: true,
      reason: 'مراجعة مسيئة ومخالفة للسياسة',
    });

    const technician = await ctx.prisma.technicianProfile.findUnique({
      where: { id: fixture.technicianId },
    });
    expect(technician?.ratingCount).toBe(1);
    expect(Number(technician?.ratingAverage)).toBe(3);
  });

  it('content_admin → allowed; removing the last review nulls the average', async () => {
    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/reviews/${fixture.reviewBId}/remove`)
      .set(auth(tokens.content_admin ?? ''))
      .send({ reason: 'تكرار المحتوى بعد حذف الأول' })
      .expect(200);

    expect(await reviewExists(fixture.reviewBId)).toBe(false);
    expect(await removalAuditCount(fixture.reviewBId)).toBe(1);

    const technician = await ctx.prisma.technicianProfile.findUnique({
      where: { id: fixture.technicianId },
    });
    expect(technician?.ratingCount).toBe(0);
    expect(technician?.ratingAverage).toBeNull();
  });

  it('super_admin removing a missing review → 404', async () => {
    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/reviews/11111111-1111-4111-8111-111111111111/remove`)
      .set(auth(tokens.super_admin ?? ''))
      .send({ reason: 'مراجعة غير موجودة' })
      .expect(404);
  });
});
