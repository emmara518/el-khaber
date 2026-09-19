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

/** Canonical API error codes → human-readable Arabic messages. */
const ARABIC_API_ERRORS: Record<string, string> = {
  AUTH_INVALID: 'رقم الهاتف أو كلمة المرور غير صحيحة. تحقق ثم حاول مجددًا',
  AUTH_REQUIRED: 'انتهت الجلسة، يرجى تسجيل الدخول من جديد',
  CONFLICT: 'هذا الحساب مسجل بالفعل. سجّل الدخول أو استخدم بيانات أخرى',
  VALIDATION_ERROR: 'تحقق من البيانات المدخلة ثم حاول مجددًا',
  FORBIDDEN: 'غير مسموح بهذا الإجراء',
  RATE_LIMITED: 'محاولات كثيرة جدًا. انتظر قليلًا ثم حاول مجددًا',
  SUBSCRIPTION_REQUIRED: 'هذه الميزة تتطلب اشتراكًا نشطًا',
  ENTITLEMENT_REQUIRED: 'هذه الميزة تتطلب ترقية الاشتراك',
  NOT_FOUND: 'العنصر غير موجود أو تم حذفه',
  INVALID_STATE_TRANSITION: 'لا يمكن تنفيذ هذا الإجراء في الحالة الحالية',
  INTERNAL_ERROR: 'حدث خطأ غير متوقع. حاول مجددًا',
};

/** Map API/network errors to a human-readable Arabic message. */
export function toArabicAuthError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim().length > 0) {
    // ApiClientError carries the server code; prefer our Arabic catalogue
    // over raw server text so users never see English messages.
    const code = (err as { code?: string }).code;
    if (typeof code === 'string' && ARABIC_API_ERRORS[code] !== undefined) {
      return ARABIC_API_ERRORS[code];
    }
    if (/failed to fetch|network|load failed|timeout/i.test(err.message)) {
      return 'تعذّر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مجددًا';
    }
    // Only surface raw server text when it is already readable Arabic.
    if (/[\u0600-\u06FF]/u.test(err.message)) {
      return err.message;
    }
  }
  return fallback;
}
