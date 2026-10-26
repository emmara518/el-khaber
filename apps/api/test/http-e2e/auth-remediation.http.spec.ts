/**
 * AUTH-001 / AUTH-004 / AUTH-006 regression tests against the real
 * isolated PostgreSQL database.
 *
 * These tests deliberately cross the HTTP boundary: guards, validation,
 * controllers, services, Prisma, and PostgreSQL. The previous audit found
 * that the fake-Prisma auth suite could not catch the reset race or the
 * unverified-email recovery path.
 */

import { createHash } from 'node:crypto';

import request, { type Response } from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  PASSWORD,
  base,
  createHttpTestApp,
  resetDatabase,
  type HttpTestContext,
  type Session,
} from './harness';

let ctx: HttpTestContext;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

function hash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

async function register(email: string): Promise<Session> {
  const res = await request(ctx.app.getHttpServer())
    .post(`${base}/auth/register`)
    .send({ role: 'customer', email, password: PASSWORD })
    .expect(201);
  return {
    accessToken: res.body.data.accessToken as string,
    refreshToken: res.body.data.refreshToken as string,
    userId: res.body.data.user.id as string,
  };
}

async function login(email: string, password: string): Promise<Response> {
  return request(ctx.app.getHttpServer())
    .post(`${base}/auth/login`)
    .send({ email, password });
}

beforeAll(async () => {
  ctx = await createHttpTestApp();
  await resetDatabase(ctx.prisma);
});

afterAll(async () => {
  await ctx.close();
});

describe('HTTP E2E â€” auth remediation', () => {
  it('requires the current password and blocks reset until the new email is verified', async () => {
    const session = await register('auth-change@example.com');
    const newEmail = 'auth-change-new@example.com';

    await request(ctx.app.getHttpServer())
      .patch(`${base}/me`)
      .set(auth(session.accessToken))
      .send({ email: newEmail })
      .expect(400);

    await request(ctx.app.getHttpServer())
      .patch(`${base}/me`)
      .set(auth(session.accessToken))
      .send({ email: newEmail, current_password: 'wrong-password' })
      .expect(401);

    await request(ctx.app.getHttpServer())
      .patch(`${base}/me`)
      .set(auth(session.accessToken))
      .send({ email: newEmail, current_password: PASSWORD })
      .expect(200);

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
    expect(user.email).toBe(newEmail);
    expect(user.emailChangePending).toBe(true);
    expect(user.emailVerified).toBe(false);
    expect(await ctx.prisma.emailVerificationToken.count({ where: { userId: session.userId } })).toBe(1);

    const before = await ctx.prisma.passwordResetToken.count({ where: { userId: session.userId } });
    await request(ctx.app.getHttpServer())
      .post(`${base}/auth/forgot-password`)
      .send({ email: newEmail })
      .expect(202);
    expect(await ctx.prisma.passwordResetToken.count({ where: { userId: session.userId } })).toBe(before);
  });

  it('consumes a pending email-verification token exactly once and enables reset', async () => {
    const session = await register('auth-verify@example.com');
    const newEmail = 'auth-verify-new@example.com';
    await request(ctx.app.getHttpServer())
      .patch(`${base}/me`)
      .set(auth(session.accessToken))
      .send({ email: newEmail, current_password: PASSWORD })
      .expect(200);

    // Replace the unknown raw token from the email change with a known one
    // for the test, without changing production code.
    await ctx.prisma.emailVerificationToken.updateMany({
      where: { userId: session.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    const raw = 'verify-email-token-0123456789abcdef';
    await ctx.prisma.emailVerificationToken.create({
      data: {
        userId: session.userId,
        newEmail,
        tokenHash: hash(raw),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await request(ctx.app.getHttpServer())
      .post(`${base}/auth/verify-email`)
      .send({ token: raw })
      .expect(200);

    const user = await ctx.prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
    expect(user.emailChangePending).toBe(false);
    expect(user.emailVerified).toBe(true);

    await request(ctx.app.getHttpServer())
      .post(`${base}/auth/verify-email`)
      .send({ token: raw })
      .expect(401);

    const before = await ctx.prisma.passwordResetToken.count({ where: { userId: session.userId } });
    await request(ctx.app.getHttpServer())
      .post(`${base}/auth/forgot-password`)
      .send({ email: newEmail })
      .expect(202);
    expect(await ctx.prisma.passwordResetToken.count({ where: { userId: session.userId } })).toBe(
      before + 1,
    );
  });

  it('allows exactly one of two concurrent reset requests to consume the token', async () => {
    const session = await register('auth-reset-race@example.com');
    const raw = 'reset-race-token-0123456789abcdef';
    await ctx.prisma.passwordResetToken.create({
      data: {
        userId: session.userId,
        tokenHash: hash(raw),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const [a, b] = await Promise.all([
      request(ctx.app.getHttpServer())
        .post(`${base}/auth/reset-password`)
        .send({ token: raw, password: 'firstNewPassw0rd' }),
      request(ctx.app.getHttpServer())
        .post(`${base}/auth/reset-password`)
        .send({ token: raw, password: 'secondNewPassw0rd' }),
    ]);

    expect([a.status, b.status].sort((x, y) => x - y)).toEqual([204, 401]);

    const first = await login('auth-reset-race@example.com', 'firstNewPassw0rd');
    const second = await login('auth-reset-race@example.com', 'secondNewPassw0rd');
    expect([first.status, second.status].sort((x, y) => x - y)).toEqual([200, 401]);
  });

  it('revokes every refresh family on global logout', async () => {
    const first = await register('auth-logout@example.com');
    const second = await login('auth-logout@example.com', PASSWORD);
    expect(second.status).toBe(200);
    const secondRefresh = second.body.data.refreshToken as string;

    await request(ctx.app.getHttpServer())
      .post(`${base}/auth/logout`)
      .send({ refreshToken: first.refreshToken })
      .expect(204);

    await request(ctx.app.getHttpServer())
      .post(`${base}/auth/refresh`)
      .send({ refreshToken: secondRefresh })
      .expect(401);
  });

  it('sets no-store on auth responses', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`${base}/auth/register`)
      .send({ role: 'customer', email: 'auth-cache@example.com', password: PASSWORD })
      .expect(201);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['pragma']).toBe('no-cache');
  });
});

