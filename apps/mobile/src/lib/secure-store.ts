/**
 * Secure storage for the refresh token. Backed by `expo-secure-store`
 * which uses the platform keychain (iOS Keychain / Android EncryptedSharedPreferences).
 * The refresh token is the only durable credential; the access token is
 * held in memory and rebuilt via `bootstrap()`.
 *
 * Source: docs/05_TECH_ARCHITECTURE.md §6, Task #002 §17.
 */

import * as SecureStore from 'expo-secure-store';

const REFRESH_KEY = 'khabir.auth.refreshToken';
const USER_KEY = 'khabir.auth.user';

export interface StoredSession {
  refreshToken: string;
  user: unknown;
}

export async function storeSession(session: StoredSession): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  if (refreshToken === null || refreshToken.length === 0) {
    return null;
  }
  const userRaw = await SecureStore.getItemAsync(USER_KEY);
  if (userRaw === null) {
    return { refreshToken, user: null };
  }
  try {
    return { refreshToken, user: JSON.parse(userRaw) as unknown };
  } catch {
    return { refreshToken, user: null };
  }
}

export async function clearStoredSession(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
