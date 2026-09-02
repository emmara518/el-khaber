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

export class ApiClient {
  private refreshing: Promise<boolean> | null = null;

  constructor(private readonly config: ApiClientConfig) {}

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
      return fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    };

    let response = await doFetch();
    if (response.status === 401 && useAuth) {
      const refreshed = await this.tryRefresh();
      if (refreshed) {
        response = await doFetch();
      } else {
        this.config.onSessionLost?.();
      }
    }

    const text = await response.text();
    const parsed: ApiResponse<T> =
      text.length > 0 ? (JSON.parse(text) as ApiResponse<T>) : ({} as ApiResponse<T>);

    if (!response.ok || 'error' in parsed) {
      const errBody =
        (parsed as ApiError).error ?? { code: 'INTERNAL_ERROR', message: response.statusText };
      throw new ApiClientError(response.status, errBody);
    }
    return parsed as ApiSuccess<T>;
  }

  private async tryRefresh(): Promise<boolean> {
    if (this.refreshing !== null) {
      return this.refreshing;
    }
    this.refreshing = (async () => {
      const stored = await loadStoredSession();
      if (stored === null) {
        clearAccessToken();
        return false;
      }
      try {
        const res = await this.unauthenticatedRequest<{
          data: { accessToken: string; refreshToken: string; expiresIn: number; user: unknown };
        }>('POST', '/auth/refresh', { refreshToken: stored.refreshToken });
        await this.persist(res.data);
        setAccessToken(res.data.accessToken);
        return true;
      } catch {
        await clearStoredSession();
        clearAccessToken();
        return false;
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
    const baseUrl =
      (typeof process !== 'undefined' && process.env !== undefined
        ? process.env['EXPO_PUBLIC_API_URL']
        : undefined) ?? 'http://localhost:3000/api/v1';
    singleton = new ApiClient({ baseUrl });
  }
  return singleton;
}

export { clearAccessToken, getAccessToken, setAccessToken };
export { ApiClientError as ApiError };
