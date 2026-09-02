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


import { getApi } from './api-client';
import { clearStoredSession, loadStoredSession, storeSession } from './secure-store';
import { clearAccessToken, setAccessToken } from './token-store';

import type { AuthSessionDto, AuthUserDto, Role } from '@khabir/shared-types';

export interface AuthState {
  status: 'unknown' | 'anonymous' | 'authenticated';
  user: AuthUserDto | null;
  expiresAt: number | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (input: { phone?: string; email?: string; password: string }) => Promise<void>;
  register: (input: { role: Role; phone?: string; email?: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  user: null,
  expiresAt: null,
  error: null,

  async bootstrap(): Promise<void> {
    const stored = await loadStoredSession();
    if (stored === null) {
      set({ status: 'anonymous', user: null, expiresAt: null });
      return;
    }
    try {
      const res = await getApi().unauthenticatedRequest<{
        data: { accessToken: string; refreshToken: string; expiresIn: number; user: AuthUserDto };
      }>('POST', '/auth/refresh', { refreshToken: stored.refreshToken });
      const data = res.data;
      setAccessToken(data.accessToken);
      await storeSession({ refreshToken: data.refreshToken, user: data.user });
      set({ status: 'authenticated', user: data.user, expiresAt: Date.now() + data.expiresIn * 1000 });
    } catch {
      await clearStoredSession();
      clearAccessToken();
      set({ status: 'anonymous', user: null, expiresAt: null });
    }
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
      set({ status: 'authenticated', user: data.user, expiresAt: Date.now() + data.expiresIn * 1000 });
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
      set({ status: 'authenticated', user: data.user, expiresAt: Date.now() + data.expiresIn * 1000 });
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
    set({ status: 'anonymous', user: null, expiresAt: null, error: null });
  },

  clearError(): void {
    set({ error: null });
  },
}));
