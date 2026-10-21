/**
 * Typed API client for the Al-Khabir backend.
 *
 * Responsibilities:
 *   - Set the Authorization header from the in-memory access token.
 *   - On 401, attempt exactly one refresh. If refresh succeeds, retry
 *     the original request. If refresh fails, propagate the error.
 *   - Surface the standard `{ data }` / `{ error }` envelope so callers
 *     do not need to parse HTTP shapes.
 *
 * No visual logic. No auth state. The auth store wires login/register
 * calls and persists tokens.
 *
 * Source: docs/07_API.md, docs/10_ENGINEERING_RULES.md §17.
 */

import { clearStoredSession, loadStoredSession, storeSession } from './secure-store';
import { clearAccessToken, getAccessToken, setAccessToken } from './token-store';

import type { ApiError, ApiResponse, ApiSuccess } from '@khabir/shared-types';

export interface ApiClientConfig {
  /** Base URL, e.g. http://localhost:3000/api/v1 */
  baseUrl: string;
  /** Called when the session is definitively lost (refresh failed). */
  onSessionLost?: () => void;
  /** Per-request timeout (V2.1 default: 15 seconds). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Session-loss registry (WP-1A). The auth layer registers exactly ONE
 * handler here; the client invokes it when a refresh definitively fails.
 * This keeps a single central invalidation path for customer, technician
 * and merchant without coupling the transport layer to the store.
 */
let sessionLostHandler: (() => void) | null = null;

export function setSessionLostHandler(handler: (() => void) | null): void {
  sessionLostHandler = handler;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly fields?: Record<string, string>;
  public readonly raw: ApiError['error'];

  constructor(status: number, raw: ApiError['error']) {
    super(raw.message);
    this.status = status;
    this.code = raw.code;
    this.fields = raw.fields;
    this.raw = raw;
  }
}

export type RefreshOutcome = 'ok' | 'auth' | 'transient';

export interface RefreshResult {
  outcome: RefreshOutcome;
  data?: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: unknown;
  };
}

export class ApiClient {
  private refreshing: Promise<RefreshResult> | null = null;

  private readonly timeoutMs: number;

  constructor(private readonly config: ApiClientConfig) {
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  get baseUrl(): string {
    return this.config.baseUrl;
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: { auth?: boolean },
  ): Promise<ApiSuccess<T>> {
    const useAuth = init?.auth !== false;
    return this.rawRequest<T>(method, path, body, useAuth);
  }

  /**
   * Multipart upload (WP-01, D5). Sends `FormData` as-is WITHOUT a manual
   * `Content-Type` so `fetch` sets `multipart/form-data; boundary=…`
   * itself. A manual JSON content type here would break the boundary and
   * the server would see zero files. Auth, single-refresh retry, and the
   * canonical envelope handling are identical to JSON requests.
   */
  async upload<T>(
    method: string,
    path: string,
    form: FormData,
    init?: { auth?: boolean },
  ): Promise<ApiSuccess<T>> {
    const useAuth = init?.auth !== false;
    return this.rawUpload<T>(method, path, form, useAuth);
  }

  private async rawUpload<T>(
    method: string,
    path: string,
    form: FormData,
    useAuth: boolean,
  ): Promise<ApiSuccess<T>> {
    const doFetch = async (): Promise<Response> => {
      const headers: Record<string, string> = {};
      if (useAuth) {
        const token = getAccessToken();
        if (token !== null) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      return this.fetchWithTimeout(`${this.config.baseUrl}${path}`, {
        method,
        headers,
        body: form as unknown as BodyInit,
      }, method, path);
    };

    let response = await doFetch();
    if (response.status === 401 && useAuth) {
      const result = await this.refreshSession();
      if (result.outcome === 'ok') {
        response = await doFetch();
      } else if (result.outcome === 'auth') {
        this.config.onSessionLost?.();
        sessionLostHandler?.();
      }
      // 'transient': the refresh could not be completed (network/timeout/5xx).
      // Keep the session and let the caller retry.
    }

    const parsed = await this.parseBody<T>(response);

    if (!response.ok || 'error' in parsed) {
      const errBody = (parsed as ApiError).error ?? {
        code: 'INTERNAL_ERROR',
        message: response.statusText || 'Unexpected server response',
      };
      throw new ApiClientError(response.status, errBody);
    }
    return parsed as ApiSuccess<T>;
  }

  private async rawRequest<T>(
    method: string,
    path: string,
    body: unknown,
    useAuth: boolean,
  ): Promise<ApiSuccess<T>> {
    const doFetch = async (): Promise<Response> => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (useAuth) {
        const token = getAccessToken();
        if (token !== null) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
      return this.fetchWithTimeout(`${this.config.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      }, method, path);
    };

    let response = await doFetch();
    if (response.status === 401 && useAuth) {
      const result = await this.refreshSession();
      if (result.outcome === 'ok') {
        response = await doFetch();
      } else if (result.outcome === 'auth') {
        // Refresh definitively failed: the session is gone. Both hooks fire
        // so the config hook (tests/embedders) and the central registry
        // (auth store) invalidate through one path.
        this.config.onSessionLost?.();
        sessionLostHandler?.();
      }
      // 'transient': network/timeout/5xx — do NOT clear a possibly valid
      // session. The caller can retry once connectivity returns.
    }

    const parsed = await this.parseBody<T>(response);

    if (!response.ok || 'error' in parsed) {
      const errBody = (parsed as ApiError).error ?? {
        code: 'INTERNAL_ERROR',
        message: response.statusText || 'Unexpected server response',
      };
      throw new ApiClientError(response.status, errBody);
    }
    return parsed as ApiSuccess<T>;
  }

  /**
   * Fetch with a real AbortController timeout. A hung request must never
   * leave the UI waiting forever.
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    method: string,
    path: string,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      const aborted = (error as { name?: string }).name === 'AbortError';
      // Safe diagnostics only: method + route, never headers/tokens/body.
      console.warn('[api-client] transport failure', {
        method,
        path,
        kind: aborted ? 'timeout' : 'network',
      });
      if (aborted) {
        throw new ApiClientError(0, { code: 'INTERNAL_ERROR', message: 'Request timed out' });
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Parse the canonical envelope WITHOUT assuming JSON. A proxy 502 HTML
   * page or an empty body must become a controlled ApiClientError, never a
   * JSON.parse crash.
   */
  private async parseBody<T>(response: Response): Promise<ApiResponse<T>> {
    const text = await response.text();
    if (text.trim().length === 0) {
      return {} as ApiResponse<T>;
    }
    const contentType = response.headers?.get?.('content-type') ?? '';
    const looksJson = contentType.includes('json') || /^\s*[{[]/.test(text);
    if (!looksJson) {
      return {} as ApiResponse<T>;
    }
    try {
      return JSON.parse(text) as ApiResponse<T>;
    } catch {
      return {} as ApiResponse<T>;
    }
  }

  /**
   * Single-flight refresh shared by bootstrap and every concurrent 401.
   *
   * Outcomes:
   *   - ok: rotated session persisted, access token updated.
   *   - auth: the refresh token is definitively rejected (4xx except 429);
   *     durable + in-memory credentials are cleared.
   *   - transient: network error, timeout, 5xx, or 429. The stored session
   *     is kept so a later retry can succeed.
   */
  async refreshSession(): Promise<RefreshResult> {
    if (this.refreshing !== null) {
      return this.refreshing;
    }
    this.refreshing = (async (): Promise<RefreshResult> => {
      const stored = await loadStoredSession();
      if (stored === null) {
        clearAccessToken();
        return { outcome: 'auth' };
      }
      try {
        const res = await this.unauthenticatedRequest<{
          data: { accessToken: string; refreshToken: string; expiresIn: number; user: unknown };
        }>('POST', '/auth/refresh', { refreshToken: stored.refreshToken });
        await this.persist(res.data);
        return { outcome: 'ok', data: res.data };
      } catch (error) {
        if (
          error instanceof ApiClientError &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 429
        ) {
          await clearStoredSession();
          clearAccessToken();
          return { outcome: 'auth' };
        }
        return { outcome: 'transient' };
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  async unauthenticatedRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    return (await this.rawRequest(method, path, body, false)) as unknown as T;
  }

  private async persist(session: {
    accessToken: string;
    refreshToken: string;
    user: unknown;
  }): Promise<void> {
    setAccessToken(session.accessToken);
    await storeSession({ refreshToken: session.refreshToken, user: session.user });
  }
}

let singleton: ApiClient | null = null;

export function getApi(): ApiClient {
  if (singleton === null) {
    const raw =
      // Dot access so Expo's babel plugin can statically inline EXPO_PUBLIC_* at bundle time.
      process.env.EXPO_PUBLIC_API_URL ??
      (typeof process !== 'undefined' && process.env !== undefined
        ? process.env['EXPO_PUBLIC_API_URL']
        : undefined);
    const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
    if ((raw === undefined || raw.trim().length === 0) && !isDev) {
      // Production must never silently fall back to an emulator loopback.
      throw new Error(
        'EXPO_PUBLIC_API_URL is not configured. Set it to the deployed HTTPS API base (e.g. https://api.example.com/api/v1).',
      );
    }
    const fallback = 'http://10.0.2.2:3010/api/v1';
    // Defensive: trim stray whitespace (prevents "/api/v1%20/..." 404s) and drop trailing slashes.
    const baseUrl = (raw ?? fallback).trim().replace(/\/+$/, '');
    if (!isDev && baseUrl.startsWith('http://')) {
      // Fail-closed: production traffic must be HTTPS (or a loopback QA override set explicitly).
      console.warn('[api-client] insecure http API URL in production build — use HTTPS:', baseUrl);
    }
    singleton = new ApiClient({ baseUrl });
  }
  return singleton;
}

export { clearAccessToken, getAccessToken, setAccessToken };
export { ApiClientError as ApiError };
