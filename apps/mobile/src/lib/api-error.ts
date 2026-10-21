/**
 * Canonical API error normalization for feature adapters (Task 10J).
 *
 * The backend answers with the canonical error envelope
 * (docs/07_API.md §3/§21): `{ error: { code, message, fields? } }`.
 * `ApiClientError` (lib/api-client) already surfaces that shape. This
 * module maps canonical codes + network failures into the Arabic,
 * user-safe messages the existing screens render — and NEVER surfaces
 * SQL, Prisma, stack traces, hosts, or internal exception text.
 *
 * Source: docs/07_API.md §21, docs/10_ENGINEERING_RULES.md §24.
 */

import { ApiError as ApiClientError } from './api-client';

/** Network/transport failure detection (offline, DNS, timeout, abort). */
export function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return /failed to fetch|network|load failed|timeout|timed out|aborted|connection/iu.test(
    err.message,
  );
}

/** Arabic, user-safe copy per canonical backend error code. */
const CODE_MESSAGES_AR: Readonly<Record<string, string>> = {
  AUTH_REQUIRED: 'انتهت صلاحية الجلسة. سجّل الدخول من جديد',
  AUTH_INVALID: 'بيانات الدخول غير صحيحة',
  FORBIDDEN: 'لا تملك صلاحية لهذا الإجراء',
  NOT_FOUND: 'العنصر المطلوب غير موجود',
  VALIDATION_ERROR: 'تحقق من صحة البيانات المدخلة',
  CONFLICT: 'البيانات موجودة مسبقًا أو مستخدمة حاليًا',
  RATE_LIMITED: 'محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا',
  SUBSCRIPTION_REQUIRED: 'هذه الميزة تتطلب اشتراكًا نشطًا',
  ENTITLEMENT_REQUIRED: 'هذه الميزة غير مضمّنة في باقتك',
  INVALID_STATE_TRANSITION: 'لا يمكن تنفيذ هذا الإجراء في الحالة الحالية',
  UPLOAD_REJECTED: 'تعذر رفع الملف',
  INTERNAL_ERROR: 'حدث خطأ غير متوقع. حاول مجددًا',
};

export const NETWORK_ERROR_AR = 'تعذر الاتصال بالخادم. تحقق من الإنترنت ثم حاول مجددًا';

/**
 * Map any thrown error into a user-safe Arabic message.
 * - network failure → connectivity message,
 * - canonical ApiClientError → code-mapped Arabic copy,
 * - anything else → the provided screen-level fallback.
 */
export function toUserMessage(err: unknown, fallback: string): string {
  if (isNetworkError(err)) return NETWORK_ERROR_AR;
  if (err instanceof ApiClientError) {
    return CODE_MESSAGES_AR[err.code] ?? fallback;
  }
  // Adapters may re-wrap canonical errors; map by code when present.
  if (
    err instanceof Error &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  ) {
    const code = String((err as { code: string }).code);
    return CODE_MESSAGES_AR[code] ?? fallback;
  }
  if (err instanceof Error && err.message.trim().length > 0) {
    // Domain errors raised by adapters themselves carry Arabic copy.
    return err.message;
  }
  return fallback;
}
