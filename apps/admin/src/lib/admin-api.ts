/**
 * Admin web API client (Task 10K).
 *
 * Admin Web App → Admin API (NestJS) → PostgreSQL. Same admin JWT
 * authority as the backend (`/admin/auth/*`); tokens stored in
 * localStorage (admin only — never user-side SecureStore).
 *
 * Contract: docs/07_API.md §18, docs/09_ADMIN.md.
 */

export interface AdminSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly admin: { id: string; email: string; role: string };
}

const TOKEN_KEY = 'khabir.admin.session';
const LOGIN_FALLBACK_AR = 'بيانات الدخول غير صحيحة';

export class AdminApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly messageAr: string;
  constructor(status: number, code: string, messageAr: string) {
    super(messageAr);
    this.status = status;
    this.code = code;
    this.messageAr = messageAr;
  }
}

const CODE_MESSAGES_AR: Readonly<Record<string, string>> = {
  AUTH_REQUIRED: 'انتهت صلاحية الجلسة. سجّل الدخول من جديد',
  AUTH_INVALID: 'بيانات الدخول غير صحيحة',
  FORBIDDEN: 'لا تملك صلاحية لهذا الإجراء',
  NOT_FOUND: 'العنصر المطلوب غير موجود',
  VALIDATION_ERROR: 'تحقق من صحة البيانات المدخلة',
  CONFLICT: 'البيانات موجودة مسبقًا أو الحالة غير مطابقة',
  RATE_LIMITED: 'محاولات كثيرة. انتظر قليلًا',
  INVALID_STATE_TRANSITION: 'لا يمكن تنفيذ الإجراء في الحالة الحالية',
  INTERNAL_ERROR: 'حدث خطأ غير متوقع',
};

function baseUrl(): string {
  const raw = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/api/v1';
  // Accept the bare host (like .env.example) or a full base URL.
  return raw.endsWith('/api/v1') ? raw : `${raw.replace(/\/$/u, '')}/api/v1`;
}

export function loadAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  const stored = readStoredSession();
  if (stored === null) return null;
  // NOTE: an expired access token does NOT invalidate the stored session.
  // Access expiry is enforced by the API (JWT `exp`); the client sends the
  // token as-is and the 401 path below performs exactly one silent refresh
  // (server-side rotation) and retries. Deleting the whole session here
  // would destroy the still-valid refresh token and make silent refresh
  // unreachable — forcing a full re-login every access-TTL window.
  return stored;
}

/** Raw stored session regardless of expiry — refresh/logout flows only. */
function readStoredSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(TOKEN_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (
      typeof parsed.accessToken !== 'string' ||
      parsed.accessToken.length === 0 ||
      typeof parsed.refreshToken !== 'string' ||
      parsed.refreshToken.length === 0 ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    return parsed as AdminSession;
  } catch {
    return null;
  }
}

/** Pre-emptive refresh window: rotate before the access token dies. */
const PROACTIVE_REFRESH_MS = 60_000;

/**
 * Single shared in-flight refresh. Concurrent 401s (or a proactive plus a
 * reactive refresh) MUST share one rotation: refresh rotates server-side
 * (the presented token is revoked), so two parallel rotations with the same
 * presented token would look like a replay and nuke the whole family.
 */
let refreshInflight: Promise<boolean> | null = null;

export function storeAdminSession(session: AdminSession): void {
  window.localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

export function clearAdminSession(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

interface ApiEnvelope<T> {
  data?: T;
  meta?: unknown;
  error?: { code: string; message: string; fields?: Record<string, string> };
}

export interface AdminListMeta {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
}

export interface AdminListResult<T> {
  readonly items: readonly T[];
  readonly meta: AdminListMeta;
}

/**
 * Performs the request and returns the FULL canonical envelope
 * (`{ data, meta }`). The API returns list metadata at the top level
 * alongside the data array, so list callers need both.
 *
 * On a 401 the client attempts exactly one silent refresh (rotating the
 * refresh family server-side) and retries the original request once. If
 * the refresh fails, the local session is cleared and the original 401
 * surfaces so the UI redirects to login. The auth endpoints themselves
 * never trigger this path.
 */
async function requestEnvelope<T>(
  method: string,
  path: string,
  body?: unknown,
  retried = false,
): Promise<{ data: T; meta: AdminListMeta | undefined }> {
  const session = loadAdminSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Auth endpoints authenticate via body credentials/refresh token — never
  // attach a (possibly expired) bearer there.
  const isAuthEndpoint =
    path === '/admin/auth/login' || path === '/admin/auth/refresh' || path === '/admin/auth/logout';
  if (session !== null && !isAuthEndpoint) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  const doFetch = async (): Promise<Response> => {
    const init: RequestInit = { method, headers: { ...headers } };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    return fetch(`${baseUrl()}${path}`, init);
  };
  let res: Response;
  // Proactive rotation: when the access token is already expired or dies
  // within the window, refresh first so the request below rarely 401s.
  const stored = readStoredSession();
  if (!isAuthEndpoint) {
    if (stored !== null && stored.expiresAt - Date.now() < PROACTIVE_REFRESH_MS) {
      const ok = await tryRefresh();
      if (!ok) {
        // Refresh dead (revoked/expired): surface the canonical session
        // error without sending a request we know will 401.
        throw new AdminApiError(401, 'AUTH_REQUIRED', CODE_MESSAGES_AR.AUTH_REQUIRED ?? 'حدث خطأ. حاول مجددًا');
      }
      // Rebuild the Authorization header from the rotated session.
      const rotated = readStoredSession();
      if (rotated !== null) {
        headers['Authorization'] = `Bearer ${rotated.accessToken}`;
      }
    }
  }
  try {
    res = await doFetch();
  } catch {
    // Network failure — normalized, user-safe (RULE 3: no fallback).
    throw new AdminApiError(0, 'NETWORK', 'تعذر الاتصال بالخادم. تحقق من الإنترنت');
  }
  const text = await res.text();
  const parsed: ApiEnvelope<T> = text.length > 0 ? JSON.parse(text) : {};
  if (!res.ok || parsed.error !== undefined) {
    const err = parsed.error ?? { code: 'INTERNAL_ERROR', message: '' };
    if (
      !retried &&
      res.status === 401 &&
      !isAuthEndpoint
    ) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return requestEnvelope<T>(method, path, body, true);
      }
    }
    const messageAr = CODE_MESSAGES_AR[err.code] ?? 'حدث خطأ. حاول مجددًا';
    if (res.status === 401) {
      clearAdminSession();
    }
    throw new AdminApiError(res.status, err.code, messageAr);
  }
  return { data: parsed.data as T, meta: parsed.meta as AdminListMeta | undefined };
}

/** Attempts one silent refresh; returns true when the session was rotated. */
async function tryRefresh(): Promise<boolean> {
  if (refreshInflight !== null) return refreshInflight;
  const pending = doRefresh();
  refreshInflight = pending;
  try {
    return await pending;
  } finally {
    if (refreshInflight === pending) refreshInflight = null;
  }
}

async function doRefresh(): Promise<boolean> {
  const stored = readStoredSession();
  if (stored === null) return false;
  try {
    const res = await fetch(`${baseUrl()}/admin/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    });
    if (!res.ok) {
      clearAdminSession();
      return false;
    }
    const parsed = (await res.json()) as ApiEnvelope<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: { id: string; email: string; role: string };
    }>;
    if (parsed.data === undefined) {
      clearAdminSession();
      return false;
    }
    const data = parsed.data;
    storeAdminSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
      admin: data.user,
    });
    return true;
  } catch {
    return false;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  return (await requestEnvelope<T>(method, path, body)).data;
}

export const AdminApi = {
  login: async (email: string, password: string): Promise<AdminSession> => {
    const data = await request<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: { id: string; email: string; role: string };
    }>('POST', '/admin/auth/login', { email, password });
    const session: AdminSession = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
      admin: data.user,
    };
    storeAdminSession(session);
    return session;
  },
  refresh: async (): Promise<boolean> => tryRefresh(),
  logout: (): void => {
    // Revoke server-side so the refresh family cannot be reused after
    // logout. Local state is cleared regardless of the network outcome.
    const stored = readStoredSession();
    if (stored !== null) {
      void fetch(`${baseUrl()}/admin/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      }).catch(() => undefined);
    }
    clearAdminSession();
  },
  request,
  list: async <T>(path: string): Promise<AdminListResult<T>> => {
    const { data, meta } = await requestEnvelope<T[]>('GET', path);
    return {
      items: data,
      meta: meta ?? { page: 1, limit: data.length, total: data.length, totalPages: 1, hasNext: false },
    };
  },
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  LOGIN_FALLBACK_AR,
};
