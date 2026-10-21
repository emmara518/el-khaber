import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

/**
 * Al-Khabir — Password reset (UAT web interface).
 *
 * Deterministic only: no agent/model steps, so no provider credential is
 * needed. Security-sensitive outcomes are checked with explicit locators and
 * assertions, never with an agent's visual judgment.
 *
 * Scenario A (this file): reset-page behavior with a missing/invalid token.
 * Scenario B (the destructive lifecycle: real token -> change password ->
 * reuse rejected) is intentionally NOT implemented here: the safety gate
 * found no dedicated, disposable, deliverable test account (see report).
 * This suite therefore never changes any account's password.
 */

const TITLE = 'تعيين كلمة مرور جديدة';
const SUCCESS = 'تم تحديث كلمة المرور بنجاح';
const TOKEN_ERROR = 'رمز الاستعادة غير صالح';
const PASSWORD_SHORT = 'كلمة المرور يجب أن تكون ١٠ أحرف على الأقل';

test('reset page with no token renders the form and shows no success', async ({ app, screen }) => {
  await app.open('/reset-password');

  await expect(screen.getByText(TITLE)).toBeVisible();
  await expect(screen.getByLabel('رمز الاستعادة')).toBeVisible();
  await expect(screen.getByRole('button', 'حفظ كلمة المرور')).toBeVisible();

  // No false-success state on a bare open.
  await expect(screen.getByText(SUCCESS, { exact: false })).toHaveCount(0);
});

test('submitting with an empty token is rejected client-side, with no success', async ({ app, screen }) => {
  await app.open('/reset-password');

  await screen.getByRole('button', 'حفظ كلمة المرور').tap();

  await expect(screen.getByRole('alert').filter({ hasText: TOKEN_ERROR })).toContainText(TOKEN_ERROR);
  await expect(screen.getByText(SUCCESS, { exact: false })).toHaveCount(0);
});

test('an invalid synthetic token cannot produce a false success and is never echoed', async ({ app, screen }) => {
  await app.open('/reset-password');

  // 12 chars < the client minimum (20): rejected before any network call.
  await screen.getByLabel('رمز الاستعادة').fill('testtoken123');
  await screen.getByLabel('كلمة المرور الجديدة').fill('StrongTest1Pass');
  await screen.getByLabel('تأكيد كلمة المرور الجديدة').fill('StrongTest1Pass');
  await screen.getByRole('button', 'حفظ كلمة المرور').tap();

  await expect(screen.getByRole('alert').filter({ hasText: TOKEN_ERROR })).toContainText(TOKEN_ERROR);
  await expect(screen.getByText(SUCCESS, { exact: false })).toHaveCount(0);
  // The rejected value must not be reflected back into UI copy.
  await expect(screen.getByRole('alert').filter({ hasText: TOKEN_ERROR })).not.toContainText('testtoken123');
});

test('a short password is rejected client-side before any submission', async ({ app, screen }) => {
  await app.open('/reset-password');

  // Token passes the client length rule (21 chars); the password does not.
  await screen.getByLabel('رمز الاستعادة').fill('abcdefghijklmnopqrstu');
  await screen.getByLabel('كلمة المرور الجديدة').fill('short');
  await screen.getByLabel('تأكيد كلمة المرور الجديدة').fill('short');
  await screen.getByRole('button', 'حفظ كلمة المرور').tap();

  await expect(screen.getByRole('alert')).toContainText(PASSWORD_SHORT);
  await expect(screen.getByText(SUCCESS, { exact: false })).toHaveCount(0);
});
