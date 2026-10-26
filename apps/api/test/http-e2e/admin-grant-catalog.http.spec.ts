/**
 * Real-HTTP E2E — admin grant catalogs (Batch 2, Phase 1B).
 *
 * The admin UI picks plans/entitlements by label; these read-only endpoints
 * feed those pickers and stay super-admin only. Also verifies that admin
 * technician search matches the display name (assignment picker).
 */

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { hashPassword } from '../../dist/auth/password';

import {
  PASSWORD,
  base,
  createHttpTestApp,
  resetDatabase,
  seedAdmin,
  seedBaseline,
  type BaselineIds,
  type HttpTestContext,
} from './harness';

let ctx: HttpTestContext;
let baseline: BaselineIds;

const EMAILS = {
  super: 'catalog-super@example.com',
  operations: 'catalog-ops@example.com',
  support: 'catalog-support@example.com',
} as const;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function seedAdminWithRole(
  role: 'operations_admin' | 'support_admin',
  email: string,
): Promise<void> {
  await ctx.prisma.adminUser.create({
    data: { email, passwordHash: await hashPassword(PASSWORD), role, status: 'active' },
  });
}

async function login(email: string): Promise<string> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/admin/auth/login`)
    .send({ email, password: PASSWORD })
    .expect(200);
  return res.body.data.accessToken as string;
}

async function seedSearchableTechnician(): Promise<string> {
  const user = await ctx.prisma.user.create({
    data: {
      email: 'catalog-tech@example.com',
      passwordHash: await hashPassword(PASSWORD),
      role: 'technician',
      technicianProfile: {
        create: { displayName: 'فني البحث', verificationStatus: 'verified' },
      },
    },
    include: { technicianProfile: true },
  });
  const id = user.technicianProfile?.id;
  if (id === undefined) throw new Error('technician profile missing');
  return id;
}

beforeAll(async () => {
  ctx = await createHttpTestApp();
  await resetDatabase(ctx.prisma);
  baseline = await seedBaseline(ctx.prisma);
  await seedAdmin(ctx.prisma, EMAILS.super);
  await seedAdminWithRole('operations_admin', EMAILS.operations);
  await seedAdminWithRole('support_admin', EMAILS.support);
  await seedSearchableTechnician();
});

afterAll(async () => {
  await ctx.close();
});

describe('HTTP E2E — admin grant catalogs', () => {
  it('unauthenticated access → 401', async () => {
    await request(ctx.app.getHttpServer()).get(`${base}/admin/plans`).expect(401);
    await request(ctx.app.getHttpServer()).get(`${base}/admin/entitlements`).expect(401);
  });

  it('super_admin lists active plans and entitlements as labels', async () => {
    const token = await login(EMAILS.super);

    const plans = await request(ctx.app.getHttpServer())
      .get(`${base}/admin/plans`)
      .set(auth(token))
      .expect(200);
    expect(plans.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: baseline.planId,
          code: 'customer-platinum',
          nameAr: 'بلاتينيوم',
          role: 'customer',
        }),
      ]),
    );
    expect(plans.body.data[0]).not.toHaveProperty('isActive');

    const entitlements = await request(ctx.app.getHttpServer())
      .get(`${base}/admin/entitlements`)
      .set(auth(token))
      .expect(200);
    expect(entitlements.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: baseline.entitlementId,
          code: 'priority_support',
          nameAr: 'دعم ذو أولوية',
        }),
      ]),
    );
  });

  it('operations_admin and support_admin → 403 (no catalog access)', async () => {
    for (const email of [EMAILS.operations, EMAILS.support]) {
      const token = await login(email);
      await request(ctx.app.getHttpServer())
        .get(`${base}/admin/plans`)
        .set(auth(token))
        .expect(403);
      await request(ctx.app.getHttpServer())
        .get(`${base}/admin/entitlements`)
        .set(auth(token))
        .expect(403);
    }
  });

  it('admin technician search matches the display name (assignment picker)', async () => {
    const token = await login(EMAILS.super);
    const res = await request(ctx.app.getHttpServer())
      .get(`${base}/admin/technicians`)
      .query({ q: 'فني البحث', verification_status: 'verified', page: '1', limit: '20' })
      .set(auth(token))
      .expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ displayName: 'فني البحث', verificationStatus: 'verified' });
  });
});
