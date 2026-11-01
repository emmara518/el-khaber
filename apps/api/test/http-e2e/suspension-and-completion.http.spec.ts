/**
 * Lane B regressions: account suspension, technician verification
 * enforcement, merchant visibility, and completed-services consistency.
 *
 * Real HTTP -> NestJS guards/controllers -> services -> Prisma -> PostgreSQL
 * (`khabir_test`). Nothing is mocked.
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
const adminEmail = 'admin-lane-b@example.com';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function register(
  role: 'customer' | 'technician' | 'merchant',
  email: string,
): Promise<Session> {
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

async function createLocation(customer: Session): Promise<string> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/locations`)
    .set(auth(customer.accessToken))
    .send({
      label: 'Home',
      address_text: '123 Test Street',
      city: 'Cairo',
      latitude: 30.04,
      longitude: 31.24,
    })
    .expect(201);
  return res.body.data.id as string;
}

async function setupVerifiedTechnician(
  email: string,
): Promise<{ session: Session; profileId: string }> {
  const session = await register('technician', email);
  await request(ctx.app.getHttpServer())
    .patch(`${base}/technician/profile`)
    .set(auth(session.accessToken))
    .send({ display_name: 'Test Technician', areas: [{ label_ar: 'Cairo' }] })
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

async function createAssignedRequest(
  customer: Session,
  technicianProfileId: string,
  locationId: string,
): Promise<string> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/service-requests`)
    .set(auth(customer.accessToken))
    .send({
      technician_id: technicianProfileId,
      appliance_category_id: baseline.categoryId,
      service_id: baseline.serviceId,
      problem_description: 'Test service request',
      location_id: locationId,
    })
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

describe('Lane B — suspension and completion integrity', () => {
  it('reports ready for the owner runtime role with 27 migrations applied', async () => {
    const res = await request(ctx.app.getHttpServer()).get(`${base}/ready`).expect(200);
    expect(res.body.data.status).toBe('ready');
    expect(res.body.data.checks).toEqual({ database: 'ok', migrations: 'ok', schema: 'ok' });
  });

  it('increments completedServicesCount exactly once on complete', async () => {
    const customer = await register('customer', 'lb-complete-c@example.com');
    const { session: tech, profileId } = await setupVerifiedTechnician(
      'lb-complete-t@example.com',
    );
    const locationId = await createLocation(customer);
    const requestId = await createAssignedRequest(customer, profileId, locationId);

    const before = await ctx.prisma.technicianProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { completedServicesCount: true },
    });
    expect(before.completedServicesCount).toBe(0);

    await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${requestId}/accept`)
      .set(auth(tech.accessToken))
      .expect(200);
    await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${requestId}/start`)
      .set(auth(tech.accessToken))
      .expect(200);
    await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${requestId}/start`)
      .set(auth(tech.accessToken))
      .expect(200);
    await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${requestId}/complete`)
      .set(auth(tech.accessToken))
      .expect(200);

    const after = await ctx.prisma.technicianProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { completedServicesCount: true },
    });
    expect(after.completedServicesCount).toBe(1);

    await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${requestId}/complete`)
      .set(auth(tech.accessToken))
      .expect(409);

    const afterDuplicate = await ctx.prisma.technicianProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { completedServicesCount: true },
    });
    expect(afterDuplicate.completedServicesCount).toBe(1);

    const stats = await request(ctx.app.getHttpServer())
      .get(`${base}/technician/stats`)
      .set(auth(tech.accessToken))
      .expect(200);
    expect(stats.body.data.completedCount).toBe(1);
    expect(stats.body.data.completedServicesCount).toBe(1);
  });

  it('admin override maintains the completed counter in both directions', async () => {
    const customer = await register('customer', 'lb-admin-complete-c@example.com');
    const { profileId } = await setupVerifiedTechnician('lb-admin-complete-t@example.com');
    const locationId = await createLocation(customer);
    const requestId = await createAssignedRequest(customer, profileId, locationId);
    const admin = await loginAdmin();

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/service-requests/${requestId}/status`)
      .set(auth(admin))
      .send({ status: 'completed' })
      .expect(200);
    const afterComplete = await ctx.prisma.technicianProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { completedServicesCount: true },
    });
    expect(afterComplete.completedServicesCount).toBe(1);

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/service-requests/${requestId}/status`)
      .set(auth(admin))
      .send({ status: 'in_progress' })
      .expect(200);
    const afterReopen = await ctx.prisma.technicianProfile.findUniqueOrThrow({
      where: { id: profileId },
      select: { completedServicesCount: true },
    });
    expect(afterReopen.completedServicesCount).toBe(0);
  });

  it('requires a reason to suspend an account', async () => {
    const customer = await register('customer', 'lb-usersusp-reason@example.com');
    const admin = await loginAdmin();

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/users/${customer.userId}/status`)
      .set(auth(admin))
      .send({ status: 'suspended' })
      .expect(400);

    const unchanged = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: customer.userId },
      select: { status: true },
    });
    expect(unchanged.status).toBe('active');
  });

  it('blocks a suspended technician from advancing an in-flight request', async () => {
    const customer = await register('customer', 'lb-techsusp-c@example.com');
    const { session: tech, profileId } = await setupVerifiedTechnician(
      'lb-techsusp-t@example.com',
    );
    const locationId = await createLocation(customer);
    const requestId = await createAssignedRequest(customer, profileId, locationId);
    const admin = await loginAdmin();

    await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${requestId}/accept`)
      .set(auth(tech.accessToken))
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/technicians/${profileId}/verification`)
      .set(auth(admin))
      .send({ status: 'suspended', reason: 'Compliance review' })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${requestId}/start`)
      .set(auth(tech.accessToken))
      .expect(403);

    const stillAccepted = await ctx.prisma.serviceRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { status: true },
    });
    expect(stillAccepted.status).toBe('accepted');

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/technicians/${profileId}/verification`)
      .set(auth(admin))
      .send({ status: 'verified' })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${requestId}/start`)
      .set(auth(tech.accessToken))
      .expect(200);
  });

  it('suspends a user account immediately and audits the decision', async () => {
    const customer = await register('customer', 'lb-usersusp-c@example.com');
    const admin = await loginAdmin();

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/users/${customer.userId}/status`)
      .set(auth(admin))
      .send({ status: 'suspended', reason: 'Fraud investigation' })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .get(`${base}/me`)
      .set(auth(customer.accessToken))
      .expect(401);

    await request(ctx.app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: 'lb-usersusp-c@example.com', password: PASSWORD })
      .expect(401);

    const suspended = await ctx.prisma.user.findUniqueOrThrow({
      where: { id: customer.userId },
      select: { status: true, tokenVersion: true },
    });
    expect(suspended.status).toBe('suspended');
    expect(suspended.tokenVersion).toBeGreaterThan(0);

    const audit = await ctx.prisma.auditLog.findFirst({
      where: { entityId: customer.userId, action: 'admin.user.status' },
      select: { afterJson: true },
    });
    expect(audit).not.toBeNull();

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/users/${customer.userId}/status`)
      .set(auth(admin))
      .send({ status: 'active', reason: 'Investigation cleared' })
      .expect(200);

    await request(ctx.app.getHttpServer())
      .post(`${base}/auth/login`)
      .send({ email: 'lb-usersusp-c@example.com', password: PASSWORD })
      .expect(200);
  });

  it('hides a suspended merchant storefront and blocks product mutations', async () => {
    const merchant = await register('merchant', 'lb-merchsusp-m@example.com');
    await request(ctx.app.getHttpServer())
      .patch(`${base}/merchant/profile`)
      .set(auth(merchant.accessToken))
      .send({ businessName: 'Test Merchant' })
      .expect(200);

    const product = await request(ctx.app.getHttpServer())
      .post(`${base}/merchant/products`)
      .set(auth(merchant.accessToken))
      .send({ nameAr: 'Test Product', price: 49.5, stockQuantity: 10 })
      .expect(201);
    const productId = product.body.data.id as string;

    const profile = await ctx.prisma.merchantProfile.findFirstOrThrow({
      where: { userId: merchant.userId },
      select: { id: true },
    });
    const admin = await loginAdmin();
    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/merchants/${profile.id}/verification`)
      .set(auth(admin))
      .send({ status: 'verified' })
      .expect(200);

    const visible = await request(ctx.app.getHttpServer()).get(`${base}/products`).expect(200);
    expect(visible.body.data.map((p: { id: string }) => p.id)).toContain(productId);

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/merchants/${profile.id}/verification`)
      .set(auth(admin))
      .send({ status: 'suspended', reason: 'Policy violation' })
      .expect(200);

    const hidden = await request(ctx.app.getHttpServer()).get(`${base}/products`).expect(200);
    expect(hidden.body.data.map((p: { id: string }) => p.id)).not.toContain(productId);

    await request(ctx.app.getHttpServer()).get(`${base}/products/${productId}`).expect(404);

    await request(ctx.app.getHttpServer())
      .post(`${base}/merchant/products`)
      .set(auth(merchant.accessToken))
      .send({ nameAr: 'Blocked Product', price: 10 })
      .expect(403);
  });

  it('hides products and discovery for account-level suspended users', async () => {
    const merchant = await register('merchant', 'lb-account-merchant@example.com');
    await request(ctx.app.getHttpServer())
      .patch(`${base}/merchant/profile`)
      .set(auth(merchant.accessToken))
      .send({ businessName: 'Account Suspension Merchant' })
      .expect(200);

    const product = await request(ctx.app.getHttpServer())
      .post(`${base}/merchant/products`)
      .set(auth(merchant.accessToken))
      .send({ nameAr: 'Account Suspension Product', price: 75.5 })
      .expect(201);
    const productId = product.body.data.id as string;

    const { session: tech, profileId } = await setupVerifiedTechnician(
      'lb-account-technician@example.com',
    );
    const admin = await loginAdmin();

    const visibleBefore = await request(ctx.app.getHttpServer())
      .get(`${base}/products`)
      .expect(200);
    expect(visibleBefore.body.data.map((p: { id: string }) => p.id)).toContain(productId);
    const techBefore = await request(ctx.app.getHttpServer())
      .get(`${base}/technicians`)
      .query({ service_id: baseline.serviceId })
      .expect(200);
    expect(techBefore.body.data.map((t: { id: string }) => t.id)).toContain(profileId);

    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/users/${merchant.userId}/status`)
      .set(auth(admin))
      .send({ status: 'suspended', reason: 'Account compliance review' })
      .expect(200);
    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/users/${tech.userId}/status`)
      .set(auth(admin))
      .send({ status: 'suspended', reason: 'Account compliance review' })
      .expect(200);

    const hidden = await request(ctx.app.getHttpServer()).get(`${base}/products`).expect(200);
    expect(hidden.body.data.map((p: { id: string }) => p.id)).not.toContain(productId);
    await request(ctx.app.getHttpServer()).get(`${base}/products/${productId}`).expect(404);

    const techAfter = await request(ctx.app.getHttpServer())
      .get(`${base}/technicians`)
      .query({ service_id: baseline.serviceId })
      .expect(200);
    expect(techAfter.body.data.map((t: { id: string }) => t.id)).not.toContain(profileId);
    await request(ctx.app.getHttpServer()).get(`${base}/technicians/${profileId}`).expect(404);
    await request(ctx.app.getHttpServer())
      .get(`${base}/technician/profile`)
      .set(auth(tech.accessToken))
      .expect(401);
  });
});
