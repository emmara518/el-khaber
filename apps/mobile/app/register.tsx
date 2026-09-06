/**
 * Register — passes the selected role into the EXISTING register
 * abstraction (`register({ role, phone?, email?, password })`).
 *
 * Only contract fields are collected (role + identity + password +
 * confirmation). No profile/business fields — those belong to later
 * onboarding phases.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { toArabicAuthError } from '../src/features/auth/auth-recovery-api';
import {
  hasErrors,
  splitIdentity,
  validateRegisterInput,
  type AuthFieldErrors,
} from '../src/features/auth/auth-validation';
import { AuthAlert, AuthButton, AuthLink } from '../src/features/auth/components/auth-feedback';
import { AuthField, PasswordField } from '../src/features/auth/components/auth-field';
import { AuthScreen } from '../src/features/auth/components/auth-screen';
import { ROLE_OPTIONS, RoleCard } from '../src/features/auth/components/role-card';
import { isRole } from '../src/features/auth/role-routing';
import { useAuthStore } from '../src/lib/auth-store';

import type { Role } from '@khabir/shared-types';

export default function RegisterRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const register = useAuthStore((s) => s.register);

  const [role, setRole] = useState<Role | null>(isRole(params.role) ? params.role : null);
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function handleSubmit() {
    const errors = validateRegisterInput({ role, identity, password, confirmPassword });
    setFieldErrors(errors);
    setFailure(null);
    if (hasErrors(errors) || role === null) return;
    setLoading(true);
    try {
      await register({ role, ...splitIdentity(identity), password });
      // Success: AuthGate routes to the authenticated role home.
    } catch (err) {
      setFailure(toArabicAuthError(err, 'فشل إنشاء الحساب. حاول مجددًا'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen title="إنشاء حساب" subtitle="اختر نوع حسابك وأدخل بياناتك للبدء">
      <Text accessibilityRole="header" accessibilityLabel="نوع الحساب" style={styles.sectionLabel}>
        نوع الحساب
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="اختيار نوع الحساب" style={styles.roles}>
        {ROLE_OPTIONS.map((option) => (
          <RoleCard key={option.role} option={option} selected={role === option.role} onSelect={setRole} />
        ))}
      </View>
      {fieldErrors.role ? <AuthAlert kind="error" message={fieldErrors.role} /> : null}
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
      />
      <PasswordField
        label="كلمة المرور (١٠ أحرف على الأقل، حرف ورقم)"
        inputLabel="كلمة المرور"
        placeholder="••••••••••"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        autoComplete="new-password"
      />
      <PasswordField
        label="تأكيد كلمة المرور"
        inputLabel="تأكيد كلمة المرور"
        placeholder="••••••••••"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        error={fieldErrors.confirmPassword}
        autoComplete="new-password"
      />
      <AuthButton label="إنشاء الحساب" loading={loading} onPress={() => void handleSubmit()} />
      <View style={styles.footer}>
        <AuthLink label="لديك حساب بالفعل؟ سجّل الدخول" onPress={() => router.push('/login')} />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    textAlign: 'right',
    writingDirection: 'rtl',
    fontWeight: '600',
  },
  roles: {
    gap: 12,
  },
  footer: {
    alignItems: 'center',
  },
});
