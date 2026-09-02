/**
 * In-memory access-token holder. The access token is short-lived
 * (default 15 minutes) and is kept in memory only. It is not persisted
 * to SecureStore because the OS keychain is meant for the long-lived
 * refresh token, and the access token is rebuilt on app start via
 * `bootstrap()` using the refresh token.
 *
 * Source: docs/05_TECH_ARCHITECTURE.md §6, Task #002 §17.
 */

let current: string | null = null;

export function getAccessToken(): string | null {
  return current;
}

export function setAccessToken(token: string): void {
  current = token;
}

export function clearAccessToken(): void {
  current = null;
}
