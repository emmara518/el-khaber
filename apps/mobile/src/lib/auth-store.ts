/**
 * Auth store. Role-aware session state for the mobile app.
 *
 * State machine (Task #002 §17):
 *   anonymous -> authenticated (login/register/refresh) -> anonymous (logout)
 *
 * The store does not perform any visual side effects. Screens subscribe
 * via selectors and render accordingly.
 *
 * Source: docs/05_TECH_ARCHITECTURE.md §5–§7, Task #002 §17.
 */

import { create } from 'zustand';


import { getApi, setSessionLostHandler } from './api-client';
import { clearStoredSession, loadStoredSession, storeSession } from './secure-store';
import { clearAccessToken, setAccessToken } from './token-store';

import type { AuthSessionDto, AuthUserDto, Role } from '@khabir/shared-types';

export interface AuthState {
  status: 'unknown' | 'anonymous' | 'authenticated';
  /** Transport state for the bootstrap attempt (retryable when offline). */
  connection: 'online' | 'offline';
  user: AuthUserDto | null;
  expiresAt: number | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (input: { phone?: string; email?: string; password: string }) => Promise<void>;
  register: (input: { role: Role; phone?: string; email?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  /** Central, local-only session invalidation (WP-1A). Idempotent. */
  handleSessionLost: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unknown',
  connection: 'online',
  user: null,
  expiresAt: null,
  error: null,

  async bootstrap(): Promise<void> {
    const stored = await loadStoredSession();
    if (stored === null) {
      set({ status: 'anonymous', connection: 'online', user: null, expiresAt: null });
      return;
    }

    // Route through the client's single-flight refresh so bootstrap and any
    // concurrent startup requests share exactly one refresh call.
    const result = await getApi().refreshSession();
    if (result.outcome === 'ok' && result.data !== undefined) {
      const data = result.data;
      set({
        status: 'authenticated',
        connection: 'online',
        user: data.user as AuthUserDto,
        expiresAt: Date.now() + data.expiresIn * 1000,
        error: null,
      });
      return;
    }

    if (result.outcome === 'auth') {
      // Definitive rejection: the durable session is already cleared by the
      // client. Only here may bootstrap drop the user to anonymous.
      await clearStoredSession();
      clearAccessToken();
      set({ status: 'anonymous', connection: 'online', user: null, expiresAt: null });
      return;
    }

    // Transient failure (offline/timeout/5xx): KEEP the stored session and
    // expose a retryable connection state. The Splash route offers retry.
    clearAccessToken();
    set({
      status: 'unknown',
      connection: 'offline',
      user: null,
      expiresAt: null,
      error: 'تعذر الاتصال بالخادم. تحقق من الشبكة وحاول تاني.',
    });
  },

  async login(input): Promise<void> {
    set({ error: null });
    try {
      const res = await getApi().unauthenticatedRequest<{ data: AuthSessionDto }>(
        'POST',
        '/auth/login',
        input,
      );
      const data = res.data;
      setAccessToken(data.accessToken);
      await storeSession({ refreshToken: data.refreshToken, user: data.user });
      set({
        status: 'authenticated',
        connection: 'online',
        user: data.user,
        expiresAt: Date.now() + data.expiresIn * 1000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message, status: 'anonymous', user: null, expiresAt: null });
      throw err;
    }
  },

  async register(input): Promise<void> {
    set({ error: null });
    try {
      const res = await getApi().unauthenticatedRequest<{ data: AuthSessionDto }>(
        'POST',
        '/auth/register',
        input,
      );
      const data = res.data;
      setAccessToken(data.accessToken);
      await storeSession({ refreshToken: data.refreshToken, user: data.user });
      set({
        status: 'authenticated',
        connection: 'online',
        user: data.user,
        expiresAt: Date.now() + data.expiresIn * 1000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      set({ error: message, status: 'anonymous', user: null, expiresAt: null });
      throw err;
    }
  },

  async logout(): Promise<void> {
    const stored = await loadStoredSession();
    if (stored !== null) {
      try {
        await getApi().unauthenticatedRequest('POST', '/auth/logout', {
          refreshToken: stored.refreshToken,
        });
      } catch {
        // Logout must always clear local state, even if the server call fails.
      }
    }
    await clearStoredSession();
    clearAccessToken();
    set({ status: 'anonymous', connection: 'online', user: null, expiresAt: null, error: null });
  },

  clearError(): void {
    set({ error: null });
  },

  async handleSessionLost(): Promise<void> {
    // Invoked by the API client when a refresh definitively fails. It is
    // LOCAL-ONLY (the refresh already failed; no server round-trip is
    // attempted) and idempotent: parallel 401s must not re-run or loop.
    // The root AuthGate sees `anonymous` and redirects to /login.
    if (get().status === 'anonymous' && get().user === null) {
      return;
    }
    await clearStoredSession();
    clearAccessToken();
    set({ status: 'anonymous', connection: 'online', user: null, expiresAt: null, error: null });
  },
}));

// Central session-loss wiring (WP-1A). One registration covers all three
// roles: the store invalidates the session and the root guard reroutes.
setSessionLostHandler(() => {
  void useAuthStore.getState().handleSessionLost();
});
