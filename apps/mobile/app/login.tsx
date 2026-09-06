/**
 * Login — uses the EXISTING auth store contract
 * (`login({ phone?, email?, password })`).
 *
 * States: initial / loading / validation error / server error /
 * network failure / success (role-home transition owned by the
 * root AuthGate, never hardcoded here).
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { toArabicAuthError } from '../src/features/auth/auth-recovery-api';
import {
  hasErrors,
  splitIdentity,
  validateLoginInput,
  type AuthFieldErrors,
} from '../src/features/auth/auth-validation';
import { AuthAlert, AuthButton, AuthLink } from '../src/features/auth/components/auth-feedback';
import { AuthField, PasswordField } from '../src/features/auth/components/auth-field';
import { AuthScreen } from '../src/features/auth/components/auth-screen';
import { useAuthStore } from '../src/lib/auth-store';

export default function LoginRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const login = useAuthStore((s) => s.login);
  const serverError = useAuthStore((s) => s.error);

  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function handleSubmit() {
    const errors = validateLoginInput({ identity, password });
    setFieldErrors(errors);
    setFailure(null);
    if (hasErrors(errors)) return;
    setLoading(true);
    try {
      await login({ ...splitIdentity(identity), password });
      // Success: AuthGate observes `authenticated` + session role and
      // routes to the correct role home. No local role flag is used.
    } catch (err) {
      setFailure(toArabicAuthError(err, 'فشل تسجيل الدخول. تحقق من بياناتك وحاول مجددًا'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen title="تسجيل الدخول" subtitle="مرحبًا بعودتك إلى الخبير">
      {params.role === 'technician' || params.role === 'merchant' || params.role === 'customer' ? (
        <Text style={styles.roleHint}>
          {params.role === 'customer' ? 'تسجيل الدخول كعميل' : params.role === 'technician' ? 'تسجيل الدخول كفني' : 'تسجيل الدخول كتاجر'}
        </Text>
      ) : null}
      {failure !== null || serverError !== null ? (
        <AuthAlert kind="error" message={failure ?? serverError ?? ''} />
      ) : null}
      <AuthField
        label="رقم الهاتف أو البريد الإلكتروني"
        inputLabel="رقم الهاتف أو البريد الإلكتروني"
        placeholder="05xxxxxxxx أو name@mail.com"
        value={identity}
        onChangeText={(v) => {
          setIdentity(v);
          if (fieldErrors.identity) setFieldErrors((e) => ({ ...e, identity: undefined }));
        }}
        error={fieldErrors.identity}
        keyboardType="default"
        autoCapitalize="none"
        autoComplete="username"
      />
      <PasswordField
        label="كلمة المرور"
        inputLabel="كلمة المرور"
        placeholder="••••••••••"
        value={password}
        onChangeText={(v) => {
          setPassword(v);
          if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
        }}
        error={fieldErrors.password}
        autoComplete="password"
      />
      <View style={styles.forgot}>
        <AuthLink label="نسيت كلمة المرور؟" onPress={() => router.push('/forgot-password')} />
      </View>
      <AuthButton label="تسجيل الدخول" loading={loading} onPress={() => void handleSubmit()} />
      <View style={styles.footer}>
        <AuthLink
          label="إنشاء حساب جديد"
          onPress={() =>
            router.push({
              pathname: '/register',
              params: params.role ? { role: params.role } : undefined,
            })
          }
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  roleHint: {
    textAlign: 'right',
    writingDirection: 'rtl',
    opacity: 0.7,
  },
  forgot: {
    alignItems: 'flex-end',
  },
  footer: {
    alignItems: 'center',
  },
});
