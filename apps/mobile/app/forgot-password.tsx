/**
 * Forgot Password — recovery start via the existing API client
 * (`POST /auth/forgot-password`). Renders validation / loading /
 * server-error / network-failure / success states explicitly.
 */

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { requestPasswordRecovery, toArabicAuthError } from '../src/features/auth/auth-recovery-api';
import {
  hasErrors,
  splitIdentity,
  validateForgotInput,
  type AuthFieldErrors,
} from '../src/features/auth/auth-validation';
import { AuthAlert, AuthButton, AuthLink } from '../src/features/auth/components/auth-feedback';
import { AuthField } from '../src/features/auth/components/auth-field';
import { AuthScreen } from '../src/features/auth/components/auth-screen';

export default function ForgotPasswordRoute() {
  const router = useRouter();
  const [identity, setIdentity] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    const errors = validateForgotInput({ identity });
    setFieldErrors(errors);
    setFailure(null);
    if (hasErrors(errors)) return;
    setLoading(true);
    try {
      await requestPasswordRecovery(splitIdentity(identity));
      setSent(true);
    } catch (err) {
      setFailure(toArabicAuthError(err, 'فشل إرسال تعليمات الاستعادة. حاول مجددًا'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen title="استعادة كلمة المرور" subtitle="أدخل رقم هاتفك أو بريدك الإلكتروني وسنرسل لك تعليمات الاستعادة">
      {sent ? <AuthAlert kind="success" message="تم إرسال تعليمات الاستعادة إن كان الحساب موجودًا." /> : null}
      {failure !== null ? <AuthAlert kind="error" message={failure} /> : null}
      <AuthField
        label="رقم الهاتف أو البريد الإلكتروني"
        inputLabel="رقم الهاتف أو البريد الإلكتروني"
        placeholder="05xxxxxxxx أو name@mail.com"
        value={identity}
        onChangeText={setIdentity}
        error={fieldErrors.identity}
        autoCapitalize="none"
        autoComplete="username"
        editable={!sent}
      />
      {!sent ? (
        <AuthButton label="إرسال تعليمات الاستعادة" loading={loading} onPress={() => void handleSubmit()} />
      ) : (
        <AuthButton label="إعادة الإرسال" loading={loading} onPress={() => void handleSubmit()} />
      )}
      <View>
        <AuthLink label="لدي رمز استعادة؟ تعيين كلمة جديدة" onPress={() => router.push('/reset-password')} />
      </View>
      <View>
        <AuthLink label="رجوع إلى تسجيل الدخول" onPress={() => router.push('/login')} />
      </View>
    </AuthScreen>
  );
}
