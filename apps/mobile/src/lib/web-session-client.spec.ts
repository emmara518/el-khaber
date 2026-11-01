import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getAccessToken } from './token-store';
import { refreshWebSession, webLogin, webLogout, webRegister } from './web-session-client';

const BASE_URL = 'http://localhost:3000/api/v1';

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv('EXPO_PUBLIC_API_URL', BASE_URL);
  vi.stubGlobal('fetch', vi.fn());
  vi.stubGlobal('document', { cookie: 'khabir_csrf=test-csrf' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('secure web session client (C-04)', () => {
  it('logs in with cookie-backed credentials and does not expose a refresh token', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            accessToken: 'access-1',
            csrfToken: 'test-csrf',
            expiresIn: 900,
            user: { id: 'u1' },
          },
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    const session = await webLogin({ email: 'a@b.com', password: 'pass1234' });

    expect(session).toEqual({
      accessToken: 'access-1',
      csrfToken: 'test-csrf',
      expiresIn: 900,
      user: { id: 'u1' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/auth/web/session/login`);
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['x-khabir-csrf']).toBe('test-csrf');
  });

  it('registers a new account using the secure web session', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            accessToken: 'access-2',
            csrfToken: 'test-csrf',
            expiresIn: 900,
            user: { id: 'u2', role: 'technician' },
          },
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );
    const session = await webRegister({
      email: 'c@d.com',
      password: 'pass1234',
      role: 'technician',
    });

    expect(session.user).toEqual({ id: 'u2', role: 'technician' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe(
      `${BASE_URL}/auth/web/session/register`,
    );
  });

  it('refreshes an HttpOnly-cookie-backed session and rotates CSRF', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            accessToken: 'access-3',
            csrfToken: 'new-csrf',
            expiresIn: 900,
            user: { id: 'u1' },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const result = await refreshWebSession();

    expect(result.outcome).toBe('ok');
    expect(result.data?.accessToken).toBe('access-3');
    expect(result.data?.csrfToken).toBe('new-csrf');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('clears in-memory access token on logout', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(new Response(undefined, { status: 204 }));
    await webLogout();

    expect(getAccessToken()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps credential rejection to an auth outcome without throwing', async () => {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: 'AUTH_INVALID', message: 'expired session' } }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      ),
    );
    const result = await refreshWebSession();

    expect(result.outcome).toBe('auth');
    expect(result.data).toBeUndefined();
  });
});
