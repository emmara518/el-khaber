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
    // Pin the client IP so the bucket key cannot split between the IPv4 and
    // IPv4-mapped IPv6 representations of the loopback socket.
    const testIp = '203.0.113.10';

    const registered = await request(server)
      .post(`${base}/auth/register`)
      .set('X-Forwarded-For', testIp)
      .send({ role: 'customer', email, password: PASSWORD });
    expect(registered.status).toBe(201);

    const refreshToken = registered.body.data.refreshToken as string;

    const login = await request(server)
      .post(`${base}/auth/login`)
      .set('X-Forwarded-For', testIp)
      .send({ email, password: PASSWORD });
    expect(login.status).toBe(200);

    const refresh = await request(server)
      .post(`${base}/auth/refresh`)
      .set('X-Forwarded-For', testIp)
      .send({ refreshToken });
    expect(refresh.status).toBe(200);

    const forgot = await request(server)
      .post(`${base}/auth/forgot-password`)
      .set('X-Forwarded-For', testIp)
      .send({ email });
    expect(forgot.status).toBe(202);

    const reset = await request(server)
      .post(`${base}/auth/reset-password`)
      .set('X-Forwarded-For', testIp)
      .send({ token: 'not-a-real-reset-token-000000', password: 'newPassword123' });
    expect(reset.status).toBe(401);

    const verify = await request(server)
      .post(`${base}/auth/verify-email`)
      .set('X-Forwarded-For', testIp)
      .send({ token: 'not-a-real-verify-token-0000000' });
    expect(verify.status).toBe(401);

    const adminLogin = await request(server)
      .post(`${base}/admin/auth/login`)
      .set('X-Forwarded-For', testIp)
      .send({ email: 'p0-admin@example.com', password: PASSWORD });
    expect(adminLogin.status).toBe(401);

    const adminRefresh = await request(server)
      .post(`${base}/admin/auth/refresh`)
      .set('X-Forwarded-For', testIp)
      .send({ refreshToken: 'not-a-real-admin-refresh-token' });
    expect(adminRefresh.status).toBe(401);

    for (const response of [registered, login, refresh, forgot, reset, verify, adminLogin, adminRefresh]) {
      expect(response.status).toBeLessThan(500);
    }

    const buckets = await ctx.prisma.rateLimitBucket.findMany({ where: { policy: 'auth' } });
    expect(buckets.length).toBeGreaterThanOrEqual(1);
    for (const bucket of buckets) {
      expect(bucket.id).toBeTruthy();
      expect(bucket.updatedAt).toBeInstanceOf(Date);
    }
    const calls = buckets.reduce((total, bucket) => total + bucket.count, 0);
    expect(calls).toBe(8);
  });
});
