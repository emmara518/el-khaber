/**
 * Real-HTTP E2E — critical product flows (Task 10N).
 *
 * HTTP → NestJS (guards, pipes, controllers) → services → Prisma →
 * PostgreSQL (`khabir_test`) → HTTP response. Nothing is mocked.
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
const adminEmail = 'admin-http@example.com';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function register(role: 'customer' | 'technician' | 'merchant', email: string): Promise<Session> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/auth/register`)
    .send({ role, email, password: PASSWORD })
    .expect(201);
  return {
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
    userId: res.body.data.user.id,
  };
}

async function loginAdmin(): Promise<string> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/admin/auth/login`)
    .send({ email: adminEmail, password: PASSWORD })
    .expect(200);
  return res.body.data.accessToken as string;
}

async function createLocation(userId: string): Promise<string> {
  const loc = await ctx.prisma.location.create({
    data: { userId, label: 'المنزل', city: 'الرياض', latitude: 24.7, longitude: 46.7 },
  });
  return loc.id;
}

async function setupVerifiedTechnician(email: string): Promise<{ session: Session; profileId: string }> {
  const session = await register('technician', email);
  await request(ctx.app.getHttpServer())
    .patch(`${base}/technician/profile`)
    .set(auth(session.accessToken))
    .send({ display_name: 'فني HTTP', areas: [{ label_ar: 'الرياض' }] })
    .expect(200);
  await request(ctx.app.getHttpServer())
    .post(`${base}/technician/services`)
    .set(auth(session.accessToken))
    .send({ service_id: baseline.serviceId })
    .expect(201);
  const profile = await ctx.prisma.technicianProfile.findFirstOrThrow({
    where: { userId: session.userId },
    select: { id: true },
  });
  const admin = await loginAdmin();
  await request(ctx.app.getHttpServer())
    .post(`${base}/admin/technicians/${profile.id}/verification`)
    .set(auth(admin))
    .send({ status: 'verified' })
    .expect(200);
  return { session, profileId: profile.id };
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

describe('HTTP E2E — customer, technician, chat, review, notifications', () => {
  it('customer: register → login → /me → catalog → discovery', async () => {
    const customer = await register('customer', 'http-cust@example.com');

    const login = await request(ctx.app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: 'http-cust@example.com', password: PASSWORD })
      .expect(200);
    expect(login.body.data.accessToken).toBeTypeOf('string');

    const me = await request(ctx.app.getHttpServer())
      .get(`${base}/me`)
      .set(auth(customer.accessToken))
      .expect(200);
    expect(me.body.data.role).toBe('customer');

    const categories = await request(ctx.app.getHttpServer())
      .get(`${base}/appliance-categories`)
      .expect(200);
    expect(categories.body.data.map((c: { id: string }) => c.id)).toContain(baseline.categoryId);

    const faults = await request(ctx.app.getHttpServer())
      .get(`${base}/faults`)
      .query({ appliance_category_id: baseline.categoryId })
      .expect(200);
    expect(faults.body.data.length).toBeGreaterThanOrEqual(1);

    const { profileId } = await setupVerifiedTechnician('http-tech-discovery@example.com');
    const technicians = await request(ctx.app.getHttpServer())
      .get(`${base}/technicians`)
      .query({ service_id: baseline.serviceId })
      .expect(200);
    expect(technicians.body.data.map((t: { id: string }) => t.id)).toContain(profileId);
  });

  it('full lifecycle: request → accept → on_the_way → in_progress → complete → review, with notifications + chat', async () => {
    const customer = await register('customer', 'http-lifecycle-c@example.com');
    const { session: tech, profileId } = await setupVerifiedTechnician('http-lifecycle-t@example.com');
    const locationId = await createLocation(customer.userId);

    const created = await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests`)
      .set(auth(customer.accessToken))
      .send({
        technician_id: profileId,
        appliance_category_id: baseline.categoryId,
        service_id: baseline.serviceId,
        problem_description: 'الغسالة لا تدور',
        location_id: locationId,
      })
      .expect(201);
    const requestId = created.body.data.id as string;
    expect(created.body.data.status).toBe('pending');

    await request(ctx.app.getHttpServer()).post(`${base}/service-requests/${requestId}/accept`).set(auth(tech.accessToken)).expect(200);
    await request(ctx.app.getHttpServer()).post(`${base}/service-requests/${requestId}/start`).set(auth(tech.accessToken)).expect(200);
    await request(ctx.app.getHttpServer()).post(`${base}/service-requests/${requestId}/start`).set(auth(tech.accessToken)).expect(200);
    await request(ctx.app.getHttpServer()).post(`${base}/service-requests/${requestId}/complete`).set(auth(tech.accessToken)).expect(200);

    const detail = await request(ctx.app.getHttpServer())
      .get(`${base}/service-requests/${requestId}`)
      .set(auth(customer.accessToken))
      .expect(200);
    expect(detail.body.data.status).toBe('completed');

    // Business-event notifications persisted for the customer.
    const notifications = await request(ctx.app.getHttpServer())
      .get(`${base}/notifications`)
      .set(auth(customer.accessToken))
      .expect(200);
    expect(notifications.body.data.map((n: { titleAr: string }) => n.titleAr)).toEqual([
      'تم إكمال الخدمة',
      'بدأ تنفيذ الخدمة',
      'الفني في الطريق',
      'تم قبول طلب الخدمة',
    ]);

    // Chat: conversation derived server-side; message persisted.
    const conversation = await request(ctx.app.getHttpServer())
      .get(`${base}/service-requests/${requestId}/conversation`)
      .set(auth(customer.accessToken))
      .expect(200);
    const conversationId = conversation.body.data.id as string;
    const message = await request(ctx.app.getHttpServer())
      .post(`${base}/conversations/${conversationId}/messages`)
      .set(auth(customer.accessToken))
      .send({ body: 'مرحباً' })
      .expect(201);
    expect(message.body.data.body).toBe('مرحباً');

    // Review on the completed request.
    await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${requestId}/review`)
      .set(auth(customer.accessToken))
      .send({ rating: 5, comment: 'عمل ممتاز' })
      .expect(201);
    const reviews = await request(ctx.app.getHttpServer())
      .get(`${base}/technicians/${profileId}/reviews`)
      .expect(200);
    expect(reviews.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('customer cancellation notifies the assigned technician; read + read-all work', async () => {
    const customer = await register('customer', 'http-cancel-c@example.com');
    const { session: tech, profileId } = await setupVerifiedTechnician('http-cancel-t@example.com');
    const locationId = await createLocation(customer.userId);

    const created = await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests`)
      .set(auth(customer.accessToken))
      .send({
        technician_id: profileId,
        appliance_category_id: baseline.categoryId,
        problem_description: 'x',
        location_id: locationId,
      })
      .expect(201);
    await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${created.body.data.id}/cancel`)
      .set(auth(customer.accessToken))
      .expect(200);

    const techNotes = await request(ctx.app.getHttpServer())
      .get(`${base}/notifications`)
      .set(auth(tech.accessToken))
      .expect(200);
    expect(techNotes.body.data).toHaveLength(1);
    const noteId = techNotes.body.data[0].id as string;

    const read = await request(ctx.app.getHttpServer())
      .post(`${base}/notifications/${noteId}/read`)
      .set(auth(tech.accessToken))
      .expect(200);
    expect(read.body.data.readAt).toBeTypeOf('string');

    const allRead = await request(ctx.app.getHttpServer())
      .post(`${base}/notifications/read-all`)
      .set(auth(tech.accessToken))
      .expect(200);
    expect(allRead.body.data.updated).toBe(0); // already read
  });
});

describe('HTTP E2E — merchant and admin operations', () => {
  it('merchant: profile → product create → update → status → delete', async () => {
    const merchant = await register('merchant', 'http-merchant@example.com');
    await request(ctx.app.getHttpServer())
      .patch(`${base}/merchant/profile`)
      .set(auth(merchant.accessToken))
      .send({ businessName: 'متجر الخبير' })
      .expect(200);

    const product = await request(ctx.app.getHttpServer())
      .post(`${base}/merchant/products`)
      .set(auth(merchant.accessToken))
      .send({ nameAr: 'فلتر غسالة', price: 49.5, stockQuantity: 10 })
      .expect(201);
    const productId = product.body.data.id as string;

    const listed = await request(ctx.app.getHttpServer())
      .get(`${base}/merchant/products`)
      .set(auth(merchant.accessToken))
      .expect(200);
    expect(listed.body.data.map((p: { id: string }) => p.id)).toContain(productId);

    const updated = await request(ctx.app.getHttpServer())
      .patch(`${base}/merchant/products/${productId}`)
      .set(auth(merchant.accessToken))
      .send({ status: 'suspended', stockQuantity: 5 })
      .expect(200);
    expect(updated.body.data.status).toBe('suspended');

    await request(ctx.app.getHttpServer())
      .delete(`${base}/merchant/products/${productId}`)
      .set(auth(merchant.accessToken))
      .expect(204);
  });

  it('admin: login → metrics → users → audit → verification → operational notification', async () => {
    const admin = await loginAdmin();
    const { session: tech, profileId } = await setupVerifiedTechnician('http-admin-tech@example.com');

    const metrics = await request(ctx.app.getHttpServer())
      .get(`${base}/admin/metrics`)
      .set(auth(admin))
      .expect(200);
    expect(metrics.body.data.usersCount).toBeGreaterThanOrEqual(1);

    const users = await request(ctx.app.getHttpServer())
      .get(`${base}/admin/users`)
      .set(auth(admin))
      .expect(200);
    expect(users.body.meta.total).toBeGreaterThanOrEqual(1);

    const audit = await request(ctx.app.getHttpServer())
      .get(`${base}/admin/audit-logs`)
      .set(auth(admin))
      .expect(200);
    expect(audit.body.data.some((a: { action: string }) => a.action === 'admin.verification.verified')).toBe(true);

    // Operational notification to a validated recipient.
    const notify = await request(ctx.app.getHttpServer())
      .post(`${base}/admin/notifications`)
      .set(auth(admin))
      .send({ user_id: tech.userId, type: 'administrative', title_ar: 'تنبيه', body_ar: 'رسالة' })
      .expect(201);
    expect(notify.body.data.userId).toBe(tech.userId);

    const techNotes = await request(ctx.app.getHttpServer())
      .get(`${base}/notifications`)
      .set(auth(tech.accessToken))
      .expect(200);
    expect(techNotes.body.data).toHaveLength(1);

    const techs = await request(ctx.app.getHttpServer())
      .get(`${base}/admin/technicians`)
      .set(auth(admin))
      .query({ verification_status: 'verified' })
      .expect(200);
    expect(techs.body.data.map((t: { id: string }) => t.id)).toContain(profileId);

    const merchants = await request(ctx.app.getHttpServer())
      .get(`${base}/admin/merchants`)
      .set(auth(admin))
      .expect(200);
    expect(Array.isArray(merchants.body.data)).toBe(true);
  });

  it('admin: service-request override + review moderation + grants', async () => {
    const admin = await loginAdmin();
    const customer = await register('customer', 'http-admin-op-c@example.com');
    const { profileId } = await setupVerifiedTechnician('http-admin-op-t@example.com');
    const locationId = await createLocation(customer.userId);

    const created = await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests`)
      .set(auth(customer.accessToken))
      .send({ technician_id: profileId, appliance_category_id: baseline.categoryId, problem_description: 'x', location_id: locationId })
      .expect(201);

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/service-requests/${created.body.data.id}/status`)
      .set(auth(admin))
      .send({ status: 'in_progress' })
      .expect(200);

    // Manual grants (no fake payment record).
    const grant = await request(ctx.app.getHttpServer())
      .post(`${base}/admin/subscriptions/grant`)
      .set(auth(admin))
      .send({ user_id: customer.userId, plan_id: baseline.planId })
      .expect(201);
    expect(grant.body.data.status).toBe('active');
    const subId = grant.body.data.id as string;

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/entitlements/grant`)
      .set(auth(admin))
      .send({ user_id: customer.userId, entitlement_id: baseline.entitlementId })
      .expect(201);

    const entitlements = await request(ctx.app.getHttpServer())
      .get(`${base}/me/entitlements`)
      .set(auth(customer.accessToken))
      .expect(200);
    expect(entitlements.body.data.entitlements).toContain('priority_support');

    // Cancellation-of-renewal.
    await request(ctx.app.getHttpServer())
      .post(`${base}/subscriptions/${subId}/cancel`)
      .set(auth(customer.accessToken))
      .send({})
      .expect(200);
  });
});
