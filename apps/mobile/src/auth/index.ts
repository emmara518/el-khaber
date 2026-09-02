/**
 * Mobile auth foundation — non-UI plumbing.
 * Re-exports the typed API client, secure storage, and the role-aware
 * auth store. Visual screens are NOT part of Task #002 and are added in
 * a later task against the approved visual references.
 *
 * Source: Task #002 §17, docs/10_ENGINEERING_RULES.md §17.
 */

export {
  getApi,
  ApiError,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  loadStoredSession,
  storeSession,
  clearStoredSession,
  useAuthStore,
  type ApiClient,
  type AuthState,
  type StoredSession,
} from '../lib';
