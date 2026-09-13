/**
 * Real-HTTP E2E — manual payment review + concurrency (Task 10N).
 *
 * Verifies the full Admin-authoritative payment flow over HTTP against the
 * isolated PostgreSQL database, including the atomic one-winner guarantee
 * for concurrent Admin review actions.
 */

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  PASSWORD,
  base,
  createHttpTestApp,
  resetDatabase,
  seedAdmin,
  seedBaseline,
  type BaselineIds,
  type HttpTestContext,
  type Session,
} from './harness';

let ctx: HttpTestContext;
let baseline: BaselineIds;
const adminEmail = 'admin-pay-http@example.com';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function register(role: 'customer' | 'technician' | 'merchant', email: string): Promise<Session> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/auth/register`)
    .send({ role, email, password: PASSWORD })
    .expect(201);
  return { accessToken: res.body.data.accessToken, refreshToken: res.body.data.refreshToken, userId: res.body.data.user.id };
}

async function loginAdmin(): Promise<string> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/admin/auth/login`)
    .send({ email: adminEmail, password: PASSWORD })
    .expect(200);
  return res.body.data.accessToken as string;
}

async function submitPayment(customer: Session, reference: string): Promise<string> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/subscriptions`)
    .set(auth(customer.accessToken))
    .send({ plan_id: baseline.planId, method: 'instapay', transfer_reference: reference })
    .expect(201);
  return res.body.data.id as string;
}

beforeAll(async () => {
  ctx = await createHttpTestApp();
  await resetDatabase(ctx.prisma);
  baseline = await seedBaseline(ctx.prisma);
  await seedAdmin(ctx.prisma, adminEmail);
});

afterAll(async () => {
  await ctx.close();
});

describe('HTTP E2E — payment flows', () => {
  it('lists enabled manual destinations; submission stays pending until Admin review', async () => {
    const customer = await register('customer', 'pay-cust@example.com');
    const config = await request(ctx.app.getHttpServer())
      .get(`${base}/payments/config`)
      .set(auth(customer.accessToken))
      .expect(200);
    expect(config.body.data.map((c: { method: string }) => c.method).sort()).toEqual(['instapay', 'vodafone_cash']);

    const submissionId = await submitPayment(customer, 'TRX-PENDING-1');
    const own = await request(ctx.app.getHttpServer())
      .get(`${base}/payments/submissions`)
      .set(auth(customer.accessToken))
      .expect(200);
    const row = own.body.data.find((s: { id: string }) => s.id === submissionId);
    expect(row.status).toBe('pending');

    // No subscription yet.
    const current = await request(ctx.app.getHttpServer())
      .get(`${base}/subscriptions/current`)
      .set(auth(customer.accessToken))
      .expect(200);
    expect(current.body.data).toBeNull();
  });

  it('Admin approval: active subscription + audit + notification (one transaction)', async () => {
    const customer = await register('customer', 'pay-approve@example.com');
    const admin = await loginAdmin();
    const submissionId = await submitPayment(customer, 'TRX-APPROVE-1');

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/payments/submissions/${submissionId}/approve`)
      .set(auth(admin))
      .expect(200);

    const current = await request(ctx.app.getHttpServer())
      .get(`${base}/subscriptions/current`)
      .set(auth(customer.accessToken))
      .expect(200);
    expect(current.body.data.status).toBe('active');

    const notifications = await request(ctx.app.getHttpServer())
      .get(`${base}/notifications`)
      .set(auth(customer.accessToken))
      .expect(200);
    expect(notifications.body.data.map((n: { titleAr: string }) => n.titleAr)).toContain('تم اعتماد عملية الدفع');

    const audit = await ctx.prisma.auditLog.findMany({ where: { action: 'admin.payment.approve', entityId: submissionId } });
    expect(audit).toHaveLength(1);
  });

  it('Admin rejection: no activation + notification + audit', async () => {
    const customer = await register('customer', 'pay-reject@example.com');
    const admin = await loginAdmin();
    const submissionId = await submitPayment(customer, 'TRX-REJECT-1');

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/payments/submissions/${submissionId}/reject`)
      .set(auth(admin))
      .expect(200);

    const current = await request(ctx.app.getHttpServer())
      .get(`${base}/subscriptions/current`)
      .set(auth(customer.accessToken))
      .expect(200);
    expect(current.body.data).toBeNull();

    const notifications = await request(ctx.app.getHttpServer())
      .get(`${base}/notifications`)
      .set(auth(customer.accessToken))
      .expect(200);
    expect(notifications.body.data.map((n: { titleAr: string }) => n.titleAr)).toContain('تم رفض إثبات الدفع');
  });

  it('concurrent Admin approvals: exactly one wins, no duplicate subscription or notification', async () => {
    const customer = await register('customer', 'pay-race@example.com');
    const admin = await loginAdmin();
    const submissionId = await submitPayment(customer, 'TRX-RACE-1');

    const approve = () =>
      request(ctx.app.getHttpServer())
        .post(`${base}/admin/payments/submissions/${submissionId}/approve`)
        .set(auth(admin));

    const [a, b] = await Promise.all([approve(), approve()]);
    const statuses = [a.status, b.status].sort((x, y) => x - y);
    expect(statuses).toEqual([200, 409]);

    const subscriptions = await ctx.prisma.subscription.count({ where: { userId: customer.userId, status: 'active' } });
    expect(subscriptions).toBe(1);

    const approvals = await ctx.prisma.notification.count({
      where: { userId: customer.userId, titleAr: 'تم اعتماد عملية الدفع' },
    });
    expect(approvals).toBe(1);
  });
});
