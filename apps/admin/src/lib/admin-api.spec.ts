import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminSession } from './admin-api';

const NOW = 1_800_000_000_000;
const BASE_URL = 'https://admin-api.test/api/v1';
const TOKEN_KEY = 'khabir.admin.session';
const admin = { id: 'admin-test', email: 'admin@example.test', role: 'SUPER_ADMIN' };
const authData = {
  accessToken: 'test-rotated-access-token',
  refreshToken: 'test-rotated-refresh-token',
  expiresIn: 900,
  user: admin,
};

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

function session(expiresAt = NOW + 300_000): AdminSession {
  return {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresAt,
    admin,
  };
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function unauthorized(): Response {
  return response({ error: { code: 'AUTH_REQUIRED', message: 'Unauthorized' } }, 401);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

let client: typeof import('./admin-api');
let storage: Storage;
const fetchMock = vi.fn<typeof fetch>();

beforeEach(async () => {
  vi.resetModules();
  storage = createStorage();
  vi.stubGlobal('window', { localStorage: storage });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NEXT_PUBLIC_API_URL', BASE_URL);
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  fetchMock.mockReset();
  fetchMock.mockRejectedValue(new Error('Unexpected mocked request'));
  client = await import('./admin-api');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('AdminApi login and session storage', () => {
  it('maps the canonical login envelope and persists the session', async () => {
    fetchMock.mockResolvedValueOnce(response({ data: authData, meta: {} }));

    const result = await client.AdminApi.login(admin.email, 'test-only-password');
    const expected = {
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      expiresAt: NOW + 900_000,
      admin,
    };

    expect(result).toEqual(expected);
    expect(client.loadAdminSession()).toEqual(expected);
    expect(storage.getItem(TOKEN_KEY)).toBe(JSON.stringify(expected));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: admin.email, password: 'test-only-password' }),
    });
  });

  it('does not refresh or retry a rejected login', async () => {
    client.storeAdminSession(session(NOW - 1));
    fetchMock.mockResolvedValueOnce(response({
      error: { code: 'AUTH_INVALID', message: 'Invalid credentials' },
    }, 401));

    await expect(client.AdminApi.login(admin.email, 'test-only-password')).rejects.toMatchObject({
      status: 401,
      code: 'AUTH_INVALID',
      messageAr: 'بيانات الدخول غير صحيحة',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(client.loadAdminSession()).toBeNull();
  });

  it('keeps expired sessions available for refresh and supports explicit clearing', () => {
    const expired = session(NOW - 1);
    client.storeAdminSession(expired);
    expect(client.loadAdminSession()).toEqual(expired);
    client.clearAdminSession();
    expect(client.loadAdminSession()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    'not-json',
    '{}',
    JSON.stringify({ ...session(), accessToken: '' }),
    JSON.stringify({ ...session(), refreshToken: '' }),
    JSON.stringify({ ...session(), expiresAt: 'invalid' }),
  ])('ignores invalid stored session %s', (stored) => {
    storage.setItem(TOKEN_KEY, stored);
    expect(client.loadAdminSession()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns no session without a browser window', () => {
    vi.stubGlobal('window', undefined);
    expect(client.loadAdminSession()).toBeNull();
  });
});

describe('AdminApi lists', () => {
  it('preserves the data array and top-level pagination metadata', async () => {
    client.storeAdminSession(session());
    const items = [{ id: 'item-test' }];
    const meta = { page: 2, limit: 10, total: 25, totalPages: 3, hasNext: true };
    fetchMock.mockResolvedValueOnce(response({ data: items, meta }));

    await expect(client.AdminApi.list('/admin/users?page=2&limit=10')).resolves.toEqual({ items, meta });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/admin/users?page=2&limit=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-access-token',
      },
    });
  });

  it.each([{ items: [] }, { items: [{ id: 'item-test' }] }])('provides metadata when absent for $items', async ({ items }) => {
    fetchMock.mockResolvedValueOnce(response({ data: items }));

    await expect(client.AdminApi.list('/admin/users')).resolves.toEqual({
      items,
      meta: { page: 1, limit: items.length, total: items.length, totalPages: 1, hasNext: false },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('AdminApi refresh and retry', () => {
  it('refreshes on 401 and retries the original method, path and body with the rotated token', async () => {
    client.storeAdminSession(session());
    const body = { status: 'APPROVED' };
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(response({ data: authData }))
      .mockResolvedValueOnce(response({ data: { updated: true } }));

    await expect(client.AdminApi.put('/admin/users/item-test', body)).resolves.toEqual({ updated: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(1, `${BASE_URL}/admin/users/item-test`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-access-token' },
      body: JSON.stringify(body),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${BASE_URL}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'test-refresh-token' }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, `${BASE_URL}/admin/users/item-test`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.accessToken}` },
      body: JSON.stringify(body),
    });
    expect(client.loadAdminSession()).toEqual({
      accessToken: authData.accessToken,
      refreshToken: authData.refreshToken,
      expiresAt: NOW + 900_000,
      admin,
    });
  });

  it('stops after a second 401 and clears the session', async () => {
    client.storeAdminSession(session());
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(response({ data: authData }))
      .mockResolvedValueOnce(unauthorized());

    await expect(client.AdminApi.get('/admin/users')).rejects.toMatchObject({ status: 401, code: 'AUTH_REQUIRED' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(client.loadAdminSession()).toBeNull();
  });

  it('clears the session without retrying when reactive refresh is rejected', async () => {
    client.storeAdminSession(session());
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(unauthorized());

    await expect(client.AdminApi.get('/admin/users')).rejects.toMatchObject({ status: 401, code: 'AUTH_REQUIRED' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(client.loadAdminSession()).toBeNull();
  });

  it.each([NOW - 1, NOW + 59_999])('proactively rotates access expiring at %s before the request', async (expiresAt) => {
    client.storeAdminSession(session(expiresAt));
    fetchMock
      .mockResolvedValueOnce(response({ data: authData }))
      .mockResolvedValueOnce(response({ data: { ready: true } }));

    await expect(client.AdminApi.get('/admin/users')).resolves.toEqual({ ready: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, `${BASE_URL}/admin/auth/refresh`, expect.objectContaining({
      body: JSON.stringify({ refreshToken: 'test-refresh-token' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, `${BASE_URL}/admin/users`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.accessToken}` },
    });
  });

  it('does not proactively refresh at the exact sixty-second boundary', async () => {
    client.storeAdminSession(session(NOW + 60_000));
    fetchMock.mockResolvedValueOnce(response({ data: [] }));

    await expect(client.AdminApi.get('/admin/users')).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/admin/users`, expect.objectContaining({ method: 'GET' }));
  });

  it('does not send the protected request when proactive refresh is rejected', async () => {
    client.storeAdminSession(session(NOW - 1));
    fetchMock.mockResolvedValueOnce(unauthorized());

    await expect(client.AdminApi.get('/admin/users')).rejects.toMatchObject({ status: 401, code: 'AUTH_REQUIRED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/admin/auth/refresh`, expect.any(Object));
    expect(client.loadAdminSession()).toBeNull();
  });

  it.each(['proactive', 'reactive'] as const)('shares one pending refresh across concurrent %s requests', async (mode) => {
    client.storeAdminSession(session(mode === 'proactive' ? NOW - 1 : NOW + 300_000));
    const rotation = deferred<Response>();
    const refreshStarted = deferred<void>();
    fetchMock.mockImplementation(async (input, init) => {
      if (input === `${BASE_URL}/admin/auth/refresh`) {
        refreshStarted.resolve();
        return rotation.promise;
      }
      const authorization = new Headers(init?.headers).get('Authorization');
      if (authorization === 'Bearer test-access-token') return unauthorized();
      return response({ data: { path: input } });
    });

    const first = client.AdminApi.get('/admin/users');
    const second = client.AdminApi.get('/admin/orders');
    const results = Promise.all([first, second]);
    await refreshStarted.promise;
    expect(fetchMock.mock.calls.filter(([url]) => url === `${BASE_URL}/admin/auth/refresh`)).toHaveLength(1);
    if (mode === 'proactive') expect(fetchMock).toHaveBeenCalledTimes(1);
    rotation.resolve(response({ data: authData }));

    await expect(results).resolves.toEqual([
      { path: `${BASE_URL}/admin/users` },
      { path: `${BASE_URL}/admin/orders` },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(mode === 'proactive' ? 3 : 5);
    expect(fetchMock.mock.calls.filter(([url]) => url === `${BASE_URL}/admin/auth/refresh`)).toHaveLength(1);
    for (const path of ['/admin/users', '/admin/orders']) {
      expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}${path}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authData.accessToken}` },
      });
    }

    fetchMock.mockResolvedValueOnce(response({ data: { ...authData, refreshToken: 'test-next-refresh-token' } }));
    await expect(client.AdminApi.refresh()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenLastCalledWith(`${BASE_URL}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: authData.refreshToken }),
    });
    expect(client.loadAdminSession()?.refreshToken).toBe('test-next-refresh-token');
  });

  it('does not refresh without a stored session', async () => {
    await expect(client.AdminApi.refresh()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('AdminApi logout', () => {
  it('clears local state immediately while revocation is still pending', async () => {
    client.storeAdminSession(session(NOW - 1));
    storage.setItem('unrelated', 'preserved');
    const revocation = deferred<Response>();
    fetchMock.mockReturnValueOnce(revocation.promise);

    expect(client.AdminApi.logout()).toBeUndefined();
    expect(client.loadAdminSession()).toBeNull();
    expect(storage.getItem(TOKEN_KEY)).toBeNull();
    expect(storage.getItem('unrelated')).toBe('preserved');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/admin/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: 'test-refresh-token' }),
    });
    revocation.resolve(new Response(null, { status: 204 }));
    await revocation.promise;
  });

  it('clears local state even if revocation fails over the network', async () => {
    client.storeAdminSession(session());
    fetchMock.mockRejectedValueOnce(new TypeError('Simulated offline'));

    expect(() => client.AdminApi.logout()).not.toThrow();
    await Promise.resolve();
    expect(client.loadAdminSession()).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not send a revocation request without a session', () => {
    client.AdminApi.logout();
    expect(storage.getItem(TOKEN_KEY)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('AdminApi errors', () => {
  it('normalizes network errors without leaking the original message or clearing the session', async () => {
    const stored = session();
    client.storeAdminSession(stored);
    fetchMock.mockRejectedValueOnce(new TypeError('Simulated internal transport detail'));

    const result = client.AdminApi.get('/admin/users');
    await expect(result).rejects.toBeInstanceOf(client.AdminApiError);
    await expect(result).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK',
      message: 'تعذر الاتصال بالخادم. تحقق من الإنترنت',
      messageAr: 'تعذر الاتصال بالخادم. تحقق من الإنترنت',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(client.loadAdminSession()).toEqual(stored);
  });

  it('maps forbidden errors without refreshing or clearing the session', async () => {
    const stored = session();
    client.storeAdminSession(stored);
    fetchMock.mockResolvedValueOnce(response({
      error: { code: 'FORBIDDEN', message: 'Simulated internal authorization detail' },
    }, 403));

    const result = client.AdminApi.get('/admin/users');
    await expect(result).rejects.toBeInstanceOf(client.AdminApiError);
    await expect(result).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: 'لا تملك صلاحية لهذا الإجراء',
      messageAr: 'لا تملك صلاحية لهذا الإجراء',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(client.loadAdminSession()).toEqual(stored);
  });
});
