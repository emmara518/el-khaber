/**
 * Reset Password — token + new password + confirmation via the
 * existing API client (`POST /auth/reset-password`). The token
 * arrives from the recovery deep link (`?token=…`) or is pasted
 * manually; both paths share the same validation.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { resetPassword, toArabicAuthError } from '../src/features/auth/auth-recovery-api';
import {
  hasErrors,
  validateResetInput,
  type AuthFieldErrors,
} from '../src/features/auth/auth-validation';
import { AuthAlert, AuthButton, AuthLink } from '../src/features/auth/components/auth-feedback';
import { AuthField, PasswordField } from '../src/features/auth/components/auth-field';
import { AuthScreen } from '../src/features/auth/components/auth-screen';

export default function ResetPasswordRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();

  const [token, setToken] = useState(typeof params.token === 'string' ? params.token : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    const errors = validateResetInput({ token, password, confirmPassword });
    setFieldErrors(errors);
    setFailure(null);
    if (hasErrors(errors)) return;
    setLoading(true);
    try {
      await resetPassword({ token: token.trim(), password });
      setDone(true);
    } catch (err) {
      setFailure(toArabicAuthError(err, 'فشل حفظ كلمة المرور. تحقق من الرمز وحاول مجددًا'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen title="تعيين كلمة مرور جديدة" subtitle="أدخل رمز الاستعادة ثم اختر كلمة مرور جديدة">
      {done ? <AuthAlert kind="success" message="تم تحديث كلمة المرور بنجاح. سجّل الدخول بحسابك." /> : null}
      {failure !== null ? <AuthAlert kind="error" message={failure} /> : null}
      <AuthField
        label="رمز الاستعادة"
        inputLabel="رمز الاستعادة"
        placeholder="الصق رمز الاستعادة هنا"
        value={token}
        onChangeText={setToken}
        error={fieldErrors.token}
        autoCapitalize="none"
        editable={!done}
      />
      <PasswordField
        label="كلمة المرور الجديدة (١٠ أحرف على الأقل، حرف ورقم)"
        inputLabel="كلمة المرور الجديدة"
        placeholder="••••••••••"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        autoComplete="new-password"
      />
      <PasswordField
        label="تأكيد كلمة المرور الجديدة"
        inputLabel="تأكيد كلمة المرور الجديدة"
        placeholder="••••••••••"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={fieldErrors.confirmPassword}
        autoComplete="new-password"
      />
      {!done ? (
        <AuthButton label="حفظ كلمة المرور" loading={loading} onPress={() => void handleSubmit()} />
      ) : (
        <AuthButton label="الانتقال إلى تسجيل الدخول" onPress={() => router.replace('/login')} />
      )}
      <View>
        <AuthLink label="رجوع إلى تسجيل الدخول" onPress={() => router.push('/login')} />
      </View>
    </AuthScreen>
  );
}
