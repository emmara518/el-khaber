/**
 * Test-only stub for `expo-secure-store`.
 *
 * The API-client chain (VM → adapter → api-client → secure-store)
 * imports this native module; vitest runs in a Node environment where
 * the native keychain cannot load. This stub mirrors the module's
 * async get/set/delete surface and answers `isAvailableAsync() === false`
 * so `secure-store` falls back to its documented in-memory path.
 * Production behavior is unchanged (the real module is used by the app).
 */

export function isAvailableAsync(): Promise<boolean> {
  return Promise.resolve(false);
}

export function getItemAsync(_key: string): Promise<string | null> {
  return Promise.resolve(null);
}

export function setItemAsync(_key: string, _value: string): Promise<void> {
  return Promise.resolve();
}

export function deleteItemAsync(_key: string): Promise<void> {
  return Promise.resolve();
}