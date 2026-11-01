/**
 * Auth store. Role-aware session state for the mobile app.
 * On web the refresh token lives only inside an HttpOnly cookie; native
 * still uses the existing SecureStore-based durable session.
 */

import { create } from 'zustand';
import {
  getApi,
  setSessionLostHandler,
} from './api-client';
import {
  clearStoredSession,
  loadStoredSession,
  storeSession,
} from './secure-store';
import {
  clearAccessToken,
  setAccessToken,
} from './token-store';
import {
  webLogin,
  webLogout,
  webRegister,
} from './web-session-client';

import type {
  AuthSessionDto,
  AuthUserDto,
  Role,
} from '@khabir/shared-types';

export interface AuthState {
  status: 'unknown' | 'anonymous' | 'authenticated';
  connection: 'online' | 'offline';
  user: AuthUserDto | null;
  expiresAt: number | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (input: { phone?: string; email?: string; password: string }) => Promise<void>;
  register: (input: {
    role: Role;
    phone?: string;
    email?: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  handleSessionLost: () => Promise<void>;
  clearError: () => void;
}

const isWeb = typeof document !== 'undefined' && document !== null && 'cookie' in document;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unknown',
  connection: 'online',
  user: null,
  expiresAt: null,
  error: null,

  async bootstrap(): Promise<void> {
    if (isWeb) {
      // Route through the client's single-flight refresh so the bootstrap
      // and every concurrent 401 share exactly ONE rotation. Two parallel
      // rotations race: the server correctly rejects the second use of
      // the presented token (401) and the restored session would be lost.
      const result = await getApi().refreshSession();
      if (result.outcome === 'ok' && result.data !== undefined) {
        set({
          status: 'authenticated',
          connection: 'online',
          user: result.data.user as AuthUserDto,
          expiresAt: Date.now() + result.data.expiresIn * 1000,
          error: null,
        });
        return;
      }
      if (result.outcome === 'auth') {
        set({ status: 'anonymous', connection: 'online', user: null, expiresAt: null, error: null });
        return;
      }
      clearAccessToken();
      set({
        status: 'unknown',
        connection: 'offline',
        user: null,
        expiresAt: null,
        error: 'Ã˜ÂªÃ˜Â¹Ã˜Â°Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂªÃ˜ÂµÃ˜Â§Ã™â€ž Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜Â¯Ã™â€¦. Ã˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â¨Ã™Æ’Ã˜Â© Ã™Ë†Ã˜Â­Ã˜Â§Ã™Ë†Ã™â€ž Ã˜ÂªÃ˜Â§Ã™â€ Ã™Å .',
      });
      return;
    }

    const stored = await loadStoredSession();
    if (stored === null) {
      set({ status: 'anonymous', connection: 'online', user: null, expiresAt: null });
      return;
    }

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
      error: 'Ã˜ÂªÃ˜Â¹Ã˜Â°Ã˜Â± Ã˜Â§Ã™â€žÃ˜Â§Ã˜ÂªÃ˜ÂµÃ˜Â§Ã™â€ž Ã˜Â¨Ã˜Â§Ã™â€žÃ˜Â®Ã˜Â§Ã˜Â¯Ã™â€¦. Ã˜ÂªÃ˜Â­Ã™â€šÃ™â€š Ã™â€¦Ã™â€  Ã˜Â§Ã™â€žÃ˜Â´Ã˜Â¨Ã™Æ’Ã˜Â© Ã™Ë†Ã˜Â­Ã˜Â§Ã™Ë†Ã™â€ž Ã˜ÂªÃ˜Â§Ã™â€ Ã™Å .',
    });
  },

  async login(input): Promise<void> {
    set({ error: null });
    try {
      if (isWeb) {
        const data = await webLogin(input);
        setAccessToken(data.accessToken);
        set({
          status: 'authenticated',
          connection: 'online',
          user: data.user as AuthUserDto,
          expiresAt: Date.now() + data.expiresIn * 1000,
        });
        return;
      }

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
      if (isWeb) {
        const data = await webRegister(input);
        setAccessToken(data.accessToken);
        set({
          status: 'authenticated',
          connection: 'online',
          user: data.user as AuthUserDto,
          expiresAt: Date.now() + data.expiresIn * 1000,
        });
        return;
      }

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
    if (isWeb) {
      try {
        await webLogout();
        clearStoredSession();
        clearAccessToken();
        set({
          status: 'anonymous',
          connection: 'online',
          user: null,
          expiresAt: null,
          error: null,
        });
        return;
      } catch {
        // Logout must always clear local state even if the server call fails.
      }
    }

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

  async handleSessionLost(): Promise<void> {
    if (isWeb) {
      // Idempotent (WP-1A): when the session is already dropped, a burst of
      // concurrent 401s must not re-fire logout requests.
      if (get().status === 'anonymous' && get().user === null) {
        return;
      }
      try {
        await webLogout();
        clearAccessToken();
      } catch {
        // The HTTP logout may fail; local state is still reset below.
      }
      clearStoredSession();
      set({ status: 'anonymous', connection: 'online', user: null, expiresAt: null, error: null });
      return;
    }

    if (get().status === 'anonymous' && get().user === null) {
      return;
    }
    await clearStoredSession();
    clearAccessToken();
    set({ status: 'anonymous', connection: 'online', user: null, expiresAt: null, error: null });
  },

  clearError(): void {
    set({ error: null });
  },
}));

setSessionLostHandler(() => {
  void useAuthStore.getState().handleSessionLost();
});

