/**
 * API client session handling (WP-1A).
 *
 * Proves the transport-level contract for all three roles (the client is
 * role-agnostic): a valid token passes through, a 401 refreshes exactly
 * once and retries, a failed refresh clears the session and invokes the
 * central session-loss handler, and concurrent 401s share ONE refresh
 * (no duplicate refresh, no loop).
 *
 * The native keychain is stubbed (see vitest.config.ts alias), so the
 * real `secure-store` in-memory fallback is exercised.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiClient, ApiClientError, setSessionLostHandler } from './api-client';
import { clearStoredSession, loadStoredSession, storeSession } from './secure-store';
import { clearAccessToken, getAccessToken, setAccessToken } from './token-store';

interface MockResponse {
  status: number;
  ok: boolean;
  statusText: string;
  text: () => Promise<string>;
}

function jsonResponse(status: number, body: unknown): MockResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: '',
    text: async () => JSON.stringify(body),
  };
}

const BASE = 'http://test.local/api/v1';

describe('ApiClient session handling (WP-1A)', () => {
  beforeEach(async () => {
    await clearStoredSession();
    clearAccessToken();
  });

  afterEach(async () => {
    await clearStoredSession();
    clearAccessToken();
    setSessionLostHandler(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends the bearer token and leaves the session untouched on success', async () => {
    setAccessToken('access-1');
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new ApiClient({ baseUrl: BASE });
    const res = await client.request<{ ok: boolean }>('GET', '/thing');

    expect(res.data.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0]?.[1] as { headers?: Record<string, string> } | undefined;
    expect(init?.headers?.Authorization).toBe('Bearer access-1');
  });

  it('refreshes once on 401 and retries the original request', async () => {
    setAccessToken('expired');
    await storeSession({ refreshToken: 'refresh-1', user: { id: 'u1' } });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'AUTH_REQUIRED', message: 'no' } }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          data: { accessToken: 'fresh', refreshToken: 'refresh-2', expiresIn: 900, user: { id: 'u1' } },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);
    const lost = vi.fn();
    setSessionLostHandler(lost);

    const client = new ApiClient({ baseUrl: BASE });
    const res = await client.request<{ ok: boolean }>('GET', '/thing');

    expect(res.data.ok).toBe(true);
    expect(getAccessToken()).toBe('fresh');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(lost).not.toHaveBeenCalled();
  });

  it('clears the session and invokes the central handler when refresh fails', async () => {
    setAccessToken('expired');
    await storeSession({ refreshToken: 'refresh-1', user: { id: 'u1' } });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'AUTH_REQUIRED', message: 'no' } }))
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'AUTH_INVALID', message: 'bad' } }));
    vi.stubGlobal('fetch', fetchMock);
    const lost = vi.fn();
    setSessionLostHandler(lost);

    const client = new ApiClient({ baseUrl: BASE });
    await expect(client.request('GET', '/thing')).rejects.toBeInstanceOf(ApiClientError);

    expect(lost).toHaveBeenCalledTimes(1);
    expect(await loadStoredSession()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('shares a single refresh across concurrent 401s (no duplicate refresh, no loop)', async () => {
    setAccessToken('expired');
    await storeSession({ refreshToken: 'refresh-1', user: { id: 'u1' } });
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return jsonResponse(401, { error: { code: 'AUTH_INVALID', message: 'bad' } });
      }
      return jsonResponse(401, { error: { code: 'AUTH_REQUIRED', message: 'no' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const lost = vi.fn();
    setSessionLostHandler(lost);

    const client = new ApiClient({ baseUrl: BASE });
    const results = await Promise.allSettled([
      client.request('GET', '/a'),
      client.request('GET', '/b'),
    ]);

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
    expect(refreshCalls).toBe(1);
    expect(lost.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(lost.mock.calls.length).toBeLessThanOrEqual(2);
  });
});
