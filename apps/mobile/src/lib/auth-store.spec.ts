/**
 * Auth store session-loss invalidation (WP-1A).
 *
 * Proves the central invalidation path: the store clears durable + in-memory
 * credentials and flips to `anonymous` (which the root AuthGate turns into a
 * /login redirect), it is idempotent, and the API client's session-loss signal
 * is actually wired to it â€” one path for customer, technician and merchant.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getApi } from './api-client';
import { useAuthStore } from './auth-store';
import { clearStoredSession, loadStoredSession, storeSession } from './secure-store';
import { clearAccessToken, getAccessToken, setAccessToken } from './token-store';

import type { AuthUserDto } from '@khabir/shared-types';

function sessionUser(): AuthUserDto {
  return {
    id: 'u1',
    role: 'customer',
    status: 'active',
    phone: '+201001112233',
    email: null,
    phoneVerified: false,
    emailVerified: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  } as AuthUserDto;
}

describe('auth store session loss (WP-1A)', () => {
  beforeEach(async () => {
    await clearStoredSession();
    clearAccessToken();
    useAuthStore.setState({ status: 'unknown', connection: 'online', user: null, expiresAt: null, error: null });
  });

  afterEach(async () => {
    await clearStoredSession();
    clearAccessToken();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('invalidates an authenticated session locally and idempotently', async () => {
    setAccessToken('access-1');
    await storeSession({ refreshToken: 'refresh-1', user: { id: 'u1' } });
    useAuthStore.setState({
      status: 'authenticated',
      user: sessionUser(),
      expiresAt: Date.now() + 60_000,
    });

    await useAuthStore.getState().handleSessionLost();

    const state = useAuthStore.getState();
    expect(state.status).toBe('anonymous');
    expect(state.user).toBeNull();
    expect(state.expiresAt).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(await loadStoredSession()).toBeNull();

    // Idempotent: a second signal must be a safe no-op (no throw, no loop).
    await expect(useAuthStore.getState().handleSessionLost()).resolves.toBeUndefined();
    expect(useAuthStore.getState().status).toBe('anonymous');
  });

  it('is invoked end-to-end when a real API request cannot be refreshed', async () => {
    const api = getApi();
    setAccessToken('expired');
    await storeSession({ refreshToken: 'refresh-1', user: { id: 'u1' } });
    useAuthStore.setState({
      status: 'authenticated',
      user: sessionUser(),
      expiresAt: Date.now() + 60_000,
    });

    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        return {
          status: 401,
          ok: false,
          statusText: '',
          text: async () => JSON.stringify({ error: { code: 'AUTH_INVALID', message: 'bad' } }),
        };
      }
      return {
        status: 401,
        ok: false,
        statusText: '',
        text: async () => JSON.stringify({ error: { code: 'AUTH_REQUIRED', message: 'no' } }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.request('GET', '/protected')).rejects.toBeDefined();

    // The API client's session-loss signal reached the store.
    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(useAuthStore.getState().user).toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});

describe('auth store bootstrap resilience (M1)', () => {
  beforeEach(async () => {
    await clearStoredSession();
    clearAccessToken();
    useAuthStore.setState({
      status: 'unknown',
      connection: 'online',
      user: null,
      expiresAt: null,
      error: null,
    });
  });

  afterEach(async () => {
    await clearStoredSession();
    clearAccessToken();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('keeps the stored session and exposes a retryable offline state on network failure', async () => {
    await storeSession({ refreshToken: 'refresh-1', user: { id: 'u1' } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network request failed')));

    await useAuthStore.getState().bootstrap();

    const state = useAuthStore.getState();
    expect(state.status).toBe('unknown');
    expect(state.connection).toBe('offline');
    expect(state.error).toBeTruthy();
    expect(await loadStoredSession()).not.toBeNull();
  });

  it('clears the session on a definitive refresh rejection', async () => {
    await storeSession({ refreshToken: 'refresh-1', user: { id: 'u1' } });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        statusText: '',
        text: async () => JSON.stringify({ error: { code: 'AUTH_INVALID', message: 'bad' } }),
      }),
    );

    await useAuthStore.getState().bootstrap();

    expect(useAuthStore.getState().status).toBe('anonymous');
    expect(await loadStoredSession()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('shares one refresh across three concurrent bootstraps', async () => {
    await storeSession({ refreshToken: 'refresh-1', user: { id: 'u1' } });
    let refreshCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toContain('/auth/refresh');
        refreshCalls += 1;
        return {
          status: 200,
          ok: true,
          statusText: '',
          text: async () =>
            JSON.stringify({
              data: {
                accessToken: 'fresh',
                refreshToken: 'refresh-2',
                expiresIn: 900,
                user: sessionUser(),
              },
            }),
        };
      }),
    );

    await Promise.all([
      useAuthStore.getState().bootstrap(),
      useAuthStore.getState().bootstrap(),
      useAuthStore.getState().bootstrap(),
    ]);

    expect(refreshCalls).toBe(1);
    expect(useAuthStore.getState().status).toBe('authenticated');
  });
});
