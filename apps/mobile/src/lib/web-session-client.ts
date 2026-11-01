import { clearAccessToken, setAccessToken } from './token-store';

const FALLBACK_BASE_URL = 'http://10.0.2.2:3010/api/v1';

function getBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  const baseUrl = (raw ?? FALLBACK_BASE_URL).trim().replace(/\/+$/, '');
  return baseUrl;
}

export interface WebAuthInput {
  email?: string;
  password: string;
  phone?: string;
  role?: string;
}

export interface WebAuthSession {
  accessToken: string;
  csrfToken: string;
  expiresIn: number;
  user: unknown;
}

interface WebEnvelope {
  data?: WebAuthSession;
  error?: { code: string; message: string };
}

const CSRF_COOKIE = 'khabir_csrf';
const CSRF_HEADER = 'x-khabir-csrf';

function isWeb(): boolean {
  return typeof document !== 'undefined' && document !== null;
}

function readCsrfCookie(): string | null {
  if (!isWeb() || typeof document === 'undefined') {
    return null;
  }
  return (
    document.cookie
      .split(/\s*;\s*/)
      .find((entry) => entry.startsWith(`${CSRF_COOKIE}=`))
      ?.split('=')
      .slice(1)
      .join('=') ?? null
  );
}

export class WebAuthError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function webEnvelopeRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(readCsrfCookie() !== null ? { [CSRF_HEADER]: readCsrfCookie() as string } : {}),
    },
    method,
  });
  const text = await response.text();
  let parsed: unknown = {};
  try {
    parsed = text.length > 0 ? JSON.parse(text) : {};
  } catch {
    parsed = {};
  }
  const envelope = parsed as WebEnvelope;
  if (response.ok) {
    if (envelope.data === undefined) {
      return undefined as unknown as T;
    }
    return envelope.data as T;
  }
  throw new WebAuthError(
    response.status,
    envelope.error?.code ?? 'INTERNAL_ERROR',
    envelope.error?.message ?? 'Unexpected response',
  );
}

export async function webLogin(input: WebAuthInput): Promise<WebAuthSession> {
  const data = await webEnvelopeRequest<WebAuthSession>('POST', '/auth/web/session/login', input);
  setAccessToken(data.accessToken);
  return data;
}

export async function webRegister(input: WebAuthInput): Promise<WebAuthSession> {
  const data = await webEnvelopeRequest<WebAuthSession>(
    'POST',
    '/auth/web/session/register',
    input,
  );
  setAccessToken(data.accessToken);
  return data;
}

export async function webRefresh(): Promise<WebAuthSession> {
  const data = await webEnvelopeRequest<WebAuthSession>('POST', '/auth/web/session/refresh');
  setAccessToken(data.accessToken);
  return data;
}

export async function webLogout(): Promise<void> {
  try {
    await webEnvelopeRequest<WebAuthSession>('POST', '/auth/web/session/logout');
  } finally {
    clearAccessToken();
  }
}

export type WebAuthOutcome = 'ok' | 'auth' | 'transient';

export interface WebRefreshResult {
  outcome: WebAuthOutcome;
  data?: WebAuthSession;
}

export async function refreshWebSession(): Promise<WebRefreshResult> {
  try {
    const data = await webRefresh();
    return { data, outcome: 'ok' };
  } catch (error) {
    if (error instanceof WebAuthError && error.status >= 400 && error.status < 500) {
      await clearAccessToken();
      return { outcome: 'auth' };
    }
    return { outcome: 'transient' };
  }
}

export type WebAuthPlatform = typeof isWeb;


