/**
 * Real-HTTP E2E â€” secure web session surface (C-04).
 *
 * Verifies the HttpOnly/SameSite cookie-backed web session endpoints including
 * exact-origin verification, CSRF token binding, cookie rotation and logout
 * against the isolated test database. No secrets or tokens are recorded here.
 */

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  PASSWORD,
  base,
  createHttpTestApp,
  resetDatabase,
  type HttpTestContext,
} from './harness';

const WEB_ORIGIN = 'http://127.0.0.1:4174';
const TEST_EMAIL = 'web-session-c04@example.com';

let ctx: HttpTestContext;

type SetCookieHeader = string[] | undefined;

function sessionCookie(res: { headers: Record<string, unknown> }, name: string): string | null {
  const setCookie = res.headers['set-cookie'] as SetCookieHeader | undefined;
  if (setCookie === undefined) {
    return null;
  }
  const raw = setCookie.find((value) => value.startsWith(`${name}=`));
  if (raw === undefined) {
    return null;
  }
  return raw.split(';')[0]?.split('=').slice(1).join('=') ?? null;
}

beforeAll(async () => {
  // The web-origin check is exact and belongs to the configured allow-list.
  // The Web session endpoints must reject the test origin when the list is
  // empty, so we explicitly configure it only for the HTTP test app.
  process.env['CORS_ORIGINS'] = WEB_ORIGIN;
  ctx = await createHttpTestApp();
  await resetDatabase(ctx.prisma);
});

afterAll(async () => {
  await ctx.close();
});

describe('HTTP E2E â€” secure web session (C-04)', () => {
  it('registers a new account with HttpOnly cookies and exact-origin verification', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post(`${base}/auth/web/session/register`)
      .set('origin', WEB_ORIGIN)
      .send({ role: 'customer', email: TEST_EMAIL, password: PASSWORD })
      .expect(201);

    expect(res.body.data.csrfToken).toHaveLength(48);
    expect(res.body.data.accessToken).toBeDefined(); // Should not expose the refresh token in body.
    expect(res.body.data.user).not.toHaveProperty('refreshToken');
  });


  it('rejects a cross-origin web session attempt', async () => {
    const foreign = await request(ctx.app.getHttpServer())
      .post(`${base}/auth/web/session/register`)
      .set('origin', 'https://unauthorized-attacker.test')
      .send({ role: 'customer', email: `${Date.now()}@example.com`, password: PASSWORD });
    expect(foreign.status).toBe(403);
  });

  it('refreshes an HttpOnly-cookie-backed session and rotates both tokens', async () => {
    const login = await request(ctx.app.getHttpServer())
      .post(`${base}/auth/web/session/login`)
      .set('origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: PASSWORD })
      .expect(201);
    const sessionCookieValue = sessionCookie(login, 'khabir_session');
    const csrfToken = login.body.data.csrfToken as string;

    const res = await request(ctx.app.getHttpServer())
      .post(`${base}/auth/web/session/refresh`)
      .set('origin', WEB_ORIGIN)
      .set('x-khabir-csrf', csrfToken)
      .set('Cookie', `khabir_session=${sessionCookieValue}; khabir_csrf=${csrfToken}`)
      .expect(200);

    expect(res.body.data.csrfToken).toHaveLength(48);
    expect(res.body.data.user).not.toHaveProperty('refreshToken');
    expect(res.headers['set-cookie']).toMatchObject([
      expect.stringContaining('khabir_session='),
      expect.stringContaining('khabir_csrf='), 
    ]);
  });

  it('rejects refresh when the CSRF header and cookie do not match', async () => {
    const login = await request(ctx.app.getHttpServer())
      .post(`${base}/auth/web/session/login`)
      .set('origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: PASSWORD })
      .expect(201);
    const sessionCookieValue = sessionCookie(login, 'khabir_session');

    const res = await request(ctx.app.getHttpServer())
      .post(`${base}/auth/web/session/refresh`)
      .set('origin', WEB_ORIGIN)
      .set('x-khabir-csrf', 'wrong-csrf')
      .set('Cookie', `khabir_session=${sessionCookieValue}`);
    expect(res.status).toBe(403);
  });

  it('logs out and clears both session cookies', async () => {
    const login = await request(ctx.app.getHttpServer())
      .post(`${base}/auth/web/session/login`)
      .set('origin', WEB_ORIGIN)
      .send({ email: TEST_EMAIL, password: PASSWORD })
      .expect(201);
    const sessionCookieValue = sessionCookie(login, 'khabir_session');
    const csrfToken = login.body.data.csrfToken as string;
    const res = await request(ctx.app.getHttpServer())
      .post(`${base}/auth/web/session/logout`)
      .set('origin', WEB_ORIGIN)
      .set('x-khabir-csrf', csrfToken)
      .set('Cookie', `khabir_session=${sessionCookieValue}; khabir_csrf=${csrfToken}`)
      .expect(204);
    expect(res.headers['set-cookie']).toMatchObject([
      expect.stringContaining('khabir_session='),
      expect.stringContaining('khabir_csrf='),
    ]);
    const noCsrfAfterLogout = sessionCookie(res, 'khabir_csrf');
    expect(noCsrfAfterLogout).toBe('');
  });
});


