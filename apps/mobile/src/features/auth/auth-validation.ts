/**
 * Client-side auth validation (Arabic messages).
 *
 * Mirrors the contract in `@khabir/shared-validation` (phone / email /
 * password / register / login / forgot / reset) without adding a zod
 * runtime dependency to the mobile app. The backend remains the
 * authoritative validator; these checks only provide fast inline
 * feedback before any network call.
 *
 * Source: docs/07_API.md §4, packages/shared-validation/src/index.ts.
 */

import type { Role } from '@khabir/shared-types';

export type AuthFieldErrors = Partial<
  Record<'identity' | 'phone' | 'email' | 'password' | 'confirmPassword' | 'role' | 'token' | 'form', string>
>;

const PHONE_RE = /^\+?[0-9]{7,15}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function isEmailLike(value: string): boolean {
  return value.includes('@');
}

export function validateIdentity(identity: string): string | null {
  const v = identity.trim();
  if (v.length === 0) return 'أدخل رقم الهاتف أو البريد الإلكتروني';
  if (isEmailLike(v)) {
    return EMAIL_RE.test(v.toLowerCase()) ? null : 'صيغة البريد الإلكتروني غير صحيحة';
  }
  return PHONE_RE.test(v) ? null : 'رقم الهاتف يجب أن يكون من ٧ إلى ١٥ رقمًا';
}

/** Split a single identity field into the existing auth contract shape. */
export function splitIdentity(identity: string): { phone?: string; email?: string } {
  const v = identity.trim();
  if (isEmailLike(v)) return { email: v.toLowerCase() };
  return { phone: v };
}

export function validatePassword(password: string): string | null {
  if (password.length === 0) return 'أدخل كلمة المرور';
  if (password.length < 10) return 'كلمة المرور يجب أن تكون ١٠ أحرف على الأقل';
  if (password.length > 128) return 'كلمة المرور يجب ألا تتجاوز ١٢٨ حرفًا';
  if (!/[A-Za-z]/u.test(password)) return 'كلمة المرور يجب أن تحتوي على حرف واحد على الأقل';
  if (!/[0-9]/u.test(password)) return 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل';
  return null;
}

export function validateLoginInput(input: { identity: string; password: string }): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const identityError = validateIdentity(input.identity);
  if (identityError !== null) errors.identity = identityError;
  if (input.password.length === 0) errors.password = 'أدخل كلمة المرور';
  return errors;
}

const VALID_ROLES: ReadonlyArray<Role> = ['customer', 'technician', 'merchant'];

export function validateRegisterInput(input: {
  role: Role | null;
  identity: string;
  password: string;
  confirmPassword: string;
}): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (input.role === null || !VALID_ROLES.includes(input.role)) {
    errors.role = 'اختر نوع الحساب أولًا';
  }
  const identityError = validateIdentity(input.identity);
  if (identityError !== null) errors.identity = identityError;
  const passwordError = validatePassword(input.password);
  if (passwordError !== null) errors.password = passwordError;
  if (input.confirmPassword.length === 0) {
    errors.confirmPassword = 'أكّد كلمة المرور';
  } else if (input.confirmPassword !== input.password) {
    errors.confirmPassword = 'تأكيد كلمة المرور غير مطابق';
  }
  return errors;
}

export function validateForgotInput(input: { identity: string }): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const identityError = validateIdentity(input.identity);
  if (identityError !== null) errors.identity = identityError;
  return errors;
}

export function validateResetInput(input: {
  token: string;
  password: string;
  confirmPassword: string;
}): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  if (input.token.trim().length < 20) errors.token = 'رمز الاستعادة غير صالح';
  const passwordError = validatePassword(input.password);
  if (passwordError !== null) errors.password = passwordError;
  if (input.confirmPassword !== input.password) {
    errors.confirmPassword = 'تأكيد كلمة المرور غير مطابق';
  }
  return errors;
}

export function hasErrors(errors: AuthFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
