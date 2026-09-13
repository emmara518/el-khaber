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
  const raw = window.localStorage.getItem(TOKEN_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as AdminSession;
    return parsed.accessToken.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

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

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const session = loadAdminSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session !== null) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  let res: Response;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // Network failure — normalized, user-safe (RULE 3: no fallback).
    throw new AdminApiError(0, 'NETWORK', 'تعذر الاتصال بالخادم. تحقق من الإنترنت');
  }
  const text = await res.text();
  const parsed: ApiEnvelope<T> = text.length > 0 ? JSON.parse(text) : {};
  if (!res.ok || parsed.error !== undefined) {
    const err = parsed.error ?? { code: 'INTERNAL_ERROR', message: '' };
    const messageAr = CODE_MESSAGES_AR[err.code] ?? 'حدث خطأ. حاول مجددًا';
    if (err.code === 'AUTH_REQUIRED' && res.status === 401) {
      clearAdminSession();
    }
    throw new AdminApiError(res.status, err.code, messageAr);
  }
  return parsed.data as T;
}

export interface AdminListResult<T> {
  readonly items: readonly T[];
  readonly meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean };
}

export const AdminApi = {
  login: async (email: string, password: string): Promise<AdminSession> => {
    const data = await request<{
      accessToken: string;
      expiresIn: number;
      user: { id: string; email: string; role: string };
    }>('POST', '/admin/auth/login', { email, password });
    const session: AdminSession = {
      accessToken: data.accessToken,
      expiresAt: Date.now() + data.expiresIn * 1000,
      admin: data.user,
    };
    storeAdminSession(session);
    return session;
  },
  logout: (): void => {
    const session = loadAdminSession();
    if (session !== null) {
      void fetch(`${baseUrl()}/admin/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: undefined }),
      }).catch(() => undefined);
    }
    clearAdminSession();
  },
  request,
  list: async <T>(path: string): Promise<{ items: T[]; meta: AdminListResult<T>['meta'] }> => {
    return (await request<{ items: T[]; meta: AdminListResult<T>['meta'] }>('GET', path)) as {
      items: T[];
      meta: AdminListResult<T>['meta'];
    };
  },
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  LOGIN_FALLBACK_AR,
};
