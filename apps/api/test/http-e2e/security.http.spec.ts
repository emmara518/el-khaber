/**
 * Real-HTTP E2E — security / authorization isolation (Task 10N).
 *
 * Cross-account (IDOR), cross-role and Admin-authority boundaries checked
 * over real HTTP against the isolated PostgreSQL database.
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
const adminEmail = 'admin-sec-http@example.com';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function register(role: 'customer' | 'technician' | 'merchant', email: string): Promise<Session> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/auth/register`)
    .send({ role, email, password: PASSWORD })
    .expect(201);
  return { accessToken: res.body.data.accessToken, userId: res.body.data.user.id };
}

async function loginAdmin(): Promise<string> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/admin/auth/login`)
    .send({ email: adminEmail, password: PASSWORD })
    .expect(200);
  return res.body.data.accessToken as string;
}

async function verifiedTechnician(email: string): Promise<{ session: Session; profileId: string }> {
  const session = await register('technician', email);
  await request(ctx.app.getHttpServer())
    .patch(`${base}/technician/profile`)
    .set(auth(session.accessToken))
    .send({ display_name: 'فني أمني' })
    .expect(200);
  const profile = await ctx.prisma.technicianProfile.findFirstOrThrow({ where: { userId: session.userId }, select: { id: true } });
  const admin = await loginAdmin();
  await request(ctx.app.getHttpServer())
    .post(`${base}/admin/technicians/${profile.id}/verification`)
    .set(auth(admin))
    .send({ status: 'verified' })
    .expect(200);
  return { session, profileId: profile.id };
}

async function location(userId: string): Promise<string> {
  const loc = await ctx.prisma.location.create({ data: { userId, latitude: 24.7, longitude: 46.7 } });
  return loc.id;
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

describe('HTTP E2E — security isolation', () => {
  it('customer cannot read another customer\'s request (identical 404)', async () => {
    const a = await register('customer', 'sec-c-a@example.com');
    const b = await register('customer', 'sec-c-b@example.com');
    const { profileId } = await verifiedTechnician('sec-c-tech@example.com');

    const created = await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests`)
      .set(auth(a.accessToken))
      .send({ technician_id: profileId, appliance_category_id: baseline.categoryId, problem_description: 'x', location_id: await location(a.userId) })
      .expect(201);

    const foreign = await request(ctx.app.getHttpServer())
      .get(`${base}/service-requests/${created.body.data.id}`)
      .set(auth(b.accessToken));
    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe('NOT_FOUND');
  });

  it('role isolation: customer cannot mutate, merchant cannot create requests, cross-role rejected', async () => {
    const customer = await register('customer', 'sec-role-c@example.com');
    const merchant = await register('merchant', 'sec-role-m@example.com');
    const { profileId } = await verifiedTechnician('sec-role-t@example.com');

    // Customer cannot call technician accept (role guard).
    const created = await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests`)
      .set(auth(customer.accessToken))
      .send({ technician_id: profileId, appliance_category_id: baseline.categoryId, problem_description: 'x', location_id: await location(customer.userId) })
      .expect(201);
    const custAccept = await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${created.body.data.id}/accept`)
      .set(auth(customer.accessToken));
    expect(custAccept.status).toBe(401);

    // Merchant cannot create service requests.
    const merchantCreate = await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests`)
      .set(auth(merchant.accessToken))
      .send({ technician_id: profileId, appliance_category_id: baseline.categoryId, problem_description: 'x', location_id: await location(merchant.userId) });
    expect(merchantCreate.status).toBe(401);

    // Customer cannot create merchant products.
    const productCreate = await request(ctx.app.getHttpServer())
      .post(`${base}/merchant/products`)
      .set(auth(customer.accessToken))
      .send({ nameAr: 'x' });
    expect(productCreate.status).toBe(401);
  });

  it('technician cannot act on another technician\'s request (404)', async () => {
    const customer = await register('customer', 'sec-tech-c@example.com');
    const tA = await verifiedTechnician('sec-tech-a@example.com');
    const tB = await verifiedTechnician('sec-tech-b@example.com');

    const created = await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests`)
      .set(auth(customer.accessToken))
      .send({ technician_id: tA.profileId, appliance_category_id: baseline.categoryId, problem_description: 'x', location_id: await location(customer.userId) })
      .expect(201);

    const foreign = await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests/${created.body.data.id}/accept`)
      .set(auth(tB.session.accessToken));
    expect(foreign.status).toBe(404);
  });

  it('merchant product ownership: other merchants cannot see or edit products', async () => {
    const a = await register('merchant', 'sec-m-a@example.com');
    const b = await register('merchant', 'sec-m-b@example.com');
    await request(ctx.app.getHttpServer()).patch(`${base}/merchant/profile`).set(auth(a.accessToken)).send({ businessName: 'A' }).expect(200);
    await request(ctx.app.getHttpServer()).patch(`${base}/merchant/profile`).set(auth(b.accessToken)).send({ businessName: 'B' }).expect(200);

    const product = await request(ctx.app.getHttpServer())
      .post(`${base}/merchant/products`)
      .set(auth(a.accessToken))
      .send({ nameAr: 'منتج أ' })
      .expect(201);
    const productId = product.body.data.id as string;

    const bList = await request(ctx.app.getHttpServer()).get(`${base}/merchant/products`).set(auth(b.accessToken)).expect(200);
    expect(bList.body.data).toHaveLength(0);

    const bFetch = await request(ctx.app.getHttpServer()).get(`${base}/merchant/products/${productId}`).set(auth(b.accessToken));
    expect(bFetch.status).toBe(404);
    const bPatch = await request(ctx.app.getHttpServer()).patch(`${base}/merchant/products/${productId}`).set(auth(b.accessToken)).send({ nameAr: 'hack' });
    expect(bPatch.status).toBe(404);
  });

  it('Admin authority is isolated: users cannot reach admin routes; admin token rejected on user routes', async () => {
    const customer = await register('customer', 'sec-admin-c@example.com');
    const admin = await loginAdmin();

    const adminAsUser = await request(ctx.app.getHttpServer()).get(`${base}/admin/metrics`).set(auth(customer.accessToken));
    expect(adminAsUser.status).toBe(401);

    const userAsAdmin = await request(ctx.app.getHttpServer()).get(`${base}/me`).set(auth(admin));
    expect(userAsAdmin.status).toBe(401);
  });

  it('notification + conversation + subscription access are recipient/participant scoped', async () => {
    const a = await register('customer', 'sec-n-a@example.com');
    const b = await register('customer', 'sec-n-b@example.com');
    const t = await verifiedTechnician('sec-n-t@example.com');
    const admin = await loginAdmin();

    // A notification for A cannot be read by B.
    await request(ctx.app.getHttpServer())
      .post(`${base}/admin/notifications`)
      .set(auth(admin))
      .send({ user_id: a.userId, type: 'administrative', title_ar: 'خاص', body_ar: 'رسالة' })
      .expect(201);
    const aNotes = await request(ctx.app.getHttpServer()).get(`${base}/notifications`).set(auth(a.accessToken)).expect(200);
    const noteId = aNotes.body.data[0].id as string;
    const foreignRead = await request(ctx.app.getHttpServer()).post(`${base}/notifications/${noteId}/read`).set(auth(b.accessToken));
    expect(foreignRead.status).toBe(404);

    // Conversation: B is not a participant of A's request.
    const created = await request(ctx.app.getHttpServer())
      .post(`${base}/service-requests`)
      .set(auth(a.accessToken))
      .send({ technician_id: t.profileId, appliance_category_id: baseline.categoryId, problem_description: 'x', location_id: await location(a.userId) })
      .expect(201);
    const conversation = await request(ctx.app.getHttpServer())
      .get(`${base}/service-requests/${created.body.data.id}/conversation`)
      .set(auth(a.accessToken))
      .expect(200);
    const conversationId = conversation.body.data.id as string;
    const foreignMessages = await request(ctx.app.getHttpServer())
      .get(`${base}/conversations/${conversationId}/messages`)
      .set(auth(b.accessToken));
    expect(foreignMessages.status).toBe(404);

    // B cannot cancel A's subscription (uniform 404).
    const grant = await request(ctx.app.getHttpServer())
      .post(`${base}/admin/subscriptions/grant`)
      .set(auth(admin))
      .send({ user_id: a.userId, plan_id: baseline.planId })
      .expect(201);
    const foreignCancel = await request(ctx.app.getHttpServer())
      .post(`${base}/subscriptions/${grant.body.data.id}/cancel`)
      .set(auth(b.accessToken))
      .send({});
    expect(foreignCancel.status).toBe(404);
  });
});
