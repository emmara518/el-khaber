/**
 * P0 regression: every @AuthThrottle() route must survive the removal of the
 * legacy UUID/timestamp defaults in migration 20261020091000.
 *
 * The shared-store guard inserts directly into rate_limit_buckets. When the
 * legacy `id`/`updated_at` defaults were dropped, that raw INSERT (which did
 * not supply them) raised PostgreSQL 23502 and every auth-sensitive route
 * returned 500 -- including registration, login, refresh, forgot/reset
 * password, and admin login/refresh.
 *
 * This suite crosses the real HTTP + Prisma + PostgreSQL boundary and asserts
 * both observable behavior (no 5xx) and the persisted bucket row (id and
 * updated_at written explicitly).
 */

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PASSWORD, base, createHttpTestApp, resetDatabase, type HttpTestContext } from './harness';

let ctx: HttpTestContext;

beforeAll(async () => {
  ctx = await createHttpTestApp();
  await resetDatabase(ctx.prisma);
  await ctx.prisma.rateLimitBucket.deleteMany({ where: { policy: 'auth' } });
});

afterAll(async () => {
  await ctx.close();
});

describe('P0 HTTP E2E - @AuthThrottle raw insert', () => {
  it('serves every auth-throttled route without a 5xx and persists the bucket', async () => {
    const server = ctx.app.getHttpServer();
    const email = 'p0-throttle@example.com';

    const registered = await request(server)
      .post(`${base}/auth/register`)
      .send({ role: 'customer', email, password: PASSWORD });
    expect(registered.status).toBe(201);

    const refreshToken = registered.body.data.refreshToken as string;

    const login = await request(server).post(`${base}/auth/login`).send({ email, password: PASSWORD });
    expect(login.status).toBe(200);

    const refresh = await request(server).post(`${base}/auth/refresh`).send({ refreshToken });
    expect(refresh.status).toBe(200);

    const forgot = await request(server).post(`${base}/auth/forgot-password`).send({ email });
    expect(forgot.status).toBe(202);

    const reset = await request(server)
      .post(`${base}/auth/reset-password`)
      .send({ token: 'not-a-real-reset-token-000000', password: 'newPassword123' });
    expect(reset.status).toBe(401);

    const verify = await request(server)
      .post(`${base}/auth/verify-email`)
      .send({ token: 'not-a-real-verify-token-0000000' });
    expect(verify.status).toBe(401);

    const adminLogin = await request(server)
      .post(`${base}/admin/auth/login`)
      .send({ email: 'p0-admin@example.com', password: PASSWORD });
    expect(adminLogin.status).toBe(401);

    const adminRefresh = await request(server)
      .post(`${base}/admin/auth/refresh`)
      .send({ refreshToken: 'not-a-real-admin-refresh-token' });
    expect(adminRefresh.status).toBe(401);

    for (const response of [registered, login, refresh, forgot, reset, verify, adminLogin, adminRefresh]) {
      expect(response.status).toBeLessThan(500);
    }

    const buckets = await ctx.prisma.rateLimitBucket.findMany({ where: { policy: 'auth' } });
    expect(buckets).toHaveLength(1);
    expect(buckets[0]?.id).toBeTruthy();
    expect(buckets[0]?.updatedAt).toBeInstanceOf(Date);
    expect(buckets[0]?.count).toBe(8);
  });
});
