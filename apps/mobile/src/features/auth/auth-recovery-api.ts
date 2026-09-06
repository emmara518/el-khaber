/**
 * Password-recovery API adapter.
 *
 * Uses the EXISTING `ApiClient` (`getApi().unauthenticatedRequest`)
 * against the documented endpoints (`POST /auth/forgot-password`,
 * `POST /auth/reset-password`). No fake endpoints, no local success
 * fabrication: when the backend is unreachable the caller receives
 * the real network error and renders a retry state.
 *
 * Source: docs/07_API.md §4.
 */

import { getApi } from '@/lib/api-client';

export async function requestPasswordRecovery(input: {
  phone?: string;
  email?: string;
}): Promise<void> {
  await getApi().unauthenticatedRequest('POST', '/auth/forgot-password', input);
}

export async function resetPassword(input: { token: string; password: string }): Promise<void> {
  await getApi().unauthenticatedRequest('POST', '/auth/reset-password', input);
}

/** Map API/network errors to a human-readable Arabic message. */
export function toArabicAuthError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim().length > 0) {
    // ApiClientError carries the server message; surface it when it is
    // already readable, otherwise fall back to the screen message.
    if (/failed to fetch|network|load failed|timeout/i.test(err.message)) {
      return 'تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مجددًا';
    }
    return err.message;
  }
  return fallback;
}
