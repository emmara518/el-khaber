/**
 * Secure storage for the refresh token. Backed by `expo-secure-store`
 * which uses the platform keychain (iOS Keychain / Android EncryptedSharedPreferences).
 * The refresh token is the only durable credential; the access token is
 * held in memory and rebuilt via `bootstrap()`.
 *
 * Web fallback (Phase 1 shell integration): `expo-secure-store` has no
 * native module on Expo Web, so the keychain calls throw at runtime.
 * When the native store is unavailable the session falls back to a
 * process-local in-memory map with identical get/set/delete semantics
 * (session-only, never persisted to localStorage — credentials must
 * not be written to web storage). Native behavior is unchanged.
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

const memoryFallback = new Map<string, string>();

async function isNativeStoreAvailable(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

async function getItem(key: string): Promise<string | null> {
  if (await isNativeStoreAvailable()) {
    return SecureStore.getItemAsync(key);
  }
  return memoryFallback.get(key) ?? null;
}

async function setItem(key: string, value: string): Promise<void> {
  if (await isNativeStoreAvailable()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  memoryFallback.set(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (await isNativeStoreAvailable()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  memoryFallback.delete(key);
}

export async function storeSession(session: StoredSession): Promise<void> {
  await setItem(REFRESH_KEY, session.refreshToken);
  await setItem(USER_KEY, JSON.stringify(session.user));
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  const refreshToken = await getItem(REFRESH_KEY);
  if (refreshToken === null || refreshToken.length === 0) {
    return null;
  }
  const userRaw = await getItem(USER_KEY);
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
  await deleteItem(REFRESH_KEY);
  await deleteItem(USER_KEY);
}
