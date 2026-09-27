/**
 * Customer Registration — account creation for the EL-KHABIR journey
 * (Splash → Onboarding → Role Selection → Create Account → Home).
 *
 * Refined to the approved registration reference: shared navy auth header
 * (AuthScreen), hero + intro + role context + social auth + credentials
 * inside one white card.
 *
 * Business contract is UNCHANGED: the role arrives from the Role Selection
 * screen as context, and this screen still calls the existing
 * `register({ role, phone?/email?, password })` abstraction with the
 * existing client validation. No fake auth, ever.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { toArabicAuthError } from '../src/features/auth/auth-recovery-api';
import {
  hasErrors,
  splitIdentity,
  validateRegisterInput,
  type AuthFieldErrors,
} from '../src/features/auth/auth-validation';
import { AuthAlert, AuthButton } from '../src/features/auth/components/auth-feedback';
import { AuthField, PasswordField } from '../src/features/auth/components/auth-field';
import { AuthScreen } from '../src/features/auth/components/auth-screen';
import { OrDivider } from '../src/features/auth/components/or-divider';
import { RoleContextCard } from '../src/features/auth/components/role-context-card';
import {
  SocialAuthButtons,
  type SocialProvider,
} from '../src/features/auth/components/social-auth-buttons';
import { TermsCheckbox } from '../src/features/auth/components/terms-checkbox';
import { isRole } from '../src/features/auth/role-routing';
import { ROLE_OPTIONS } from '../src/features/auth/roles';
import { useAuthStore } from '../src/lib/auth-store';
import {
  REGISTRATION_HERO_ASPECT_RATIO,
  registrationAssets,
} from '../src/ui/registration-assets';
import { fontFamily, type } from '../src/ui/typography';

import type { Role } from '@khabir/shared-types';

const SOCIAL_NAME: Record<SocialProvider, string> = { google: 'جوجل', facebook: 'فيسبوك' };

export default function RegisterRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const register = useAuthStore((s) => s.register);

  // A valid role always arrives from the Role Selection screen; a direct
  // entry defaults to the Customer account (the Customer app) and can be
  // changed inline.
  const [role] = useState<Role>(() => (isRole(params.role) ? params.role : 'customer'));
  const option = ROLE_OPTIONS.find((item) => item.role === role) ?? ROLE_OPTIONS[0];

  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit() {
    const errors = validateRegisterInput({ role, identity, password, confirmPassword });
    setFieldErrors(errors);
    setFailure(null);
    if (hasErrors(errors)) return;
    setLoading(true);
    try {
      await register({ role, ...splitIdentity(identity), password });
      // Success: AuthGate routes to the authenticated role home. Never
      // claim success here before the backend confirms.
    } catch (err) {
      setFailure(toArabicAuthError(err, 'فشل إنشاء الحساب. حاول مجددًا'));
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/account-type');
    }
  }

  function handleSocial(provider: SocialProvider) {
    // No OAuth provider is wired into the auth architecture yet, so we
    // surface an honest state instead of faking a sign-in. The selected
    // role remains preserved in `role` for when the provider is connected.
    setNotice(`المتابعة باستخدام ${SOCIAL_NAME[provider]} غير متاحة بعد، وسيتم تفعيلها عند ربط مزوّد المصادقة.`);
  }

  return (
    <AuthScreen
      title="إنشاء حساب جديد"
      subtitle="ابدأ رحلتك مع الخبير واحصل على صيانة موثوقة"
      headingLabel="إنشاء حساب جديد"
      onBack={handleBack}
      centerHeading
    >
      <View style={styles.hero}>
        <Image
          source={registrationAssets.heroAppliances}
          accessibilityRole="image"
          accessibilityLabel="أجهزة منزلية مع صندوق أدوات الخبير"
          resizeMode="contain"
          style={styles.heroImage}
        />
      </View>

      <RoleContextCard option={option} onChangeRole={() => router.replace('/account-type')} />

      <OrDivider label="أو تابع باستخدام" />
      <SocialAuthButtons onProvider={handleSocial} disabled={loading} />
      {notice ? <AuthAlert kind="info" message={notice} /> : null}

      <OrDivider label="أو أنشئ حسابًا جديدًا" />

      <AuthField
        label="رقم الهاتف أو البريد الإلكتروني"
        inputLabel="رقم الهاتف أو البريد الإلكتروني"
        placeholder="05xxxxxxxx أو name@mail.com"
        startIcon="mail"
        value={identity}
        onChangeText={setIdentity}
        error={fieldErrors.identity}
        autoCapitalize="none"
        autoComplete="username"
      />

      <PasswordField
        label="كلمة المرور"
        inputLabel="كلمة المرور"
        placeholder="••••••••••"
        value={password}
        onChangeText={setPassword}
        error={fieldErrors.password}
        hint="استخدم كلمة مرور قوية لا تقل عن ١٠ أحرف وتحتوي على أرقام وحروف"
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

      {failure !== null ? <AuthAlert kind="error" message={failure} /> : null}

      <TermsCheckbox
        checked={termsAccepted}
        onToggle={() => setTermsAccepted((value) => !value)}
      >
        أوافق على <Text style={styles.termsLink}>شروط الاستخدام</Text> و
        <Text style={styles.termsLink}>سياسة الخصوصية</Text>
      </TermsCheckbox>

      <AuthButton
        label="إنشاء الحساب"
        onPress={() => void handleSubmit()}
        loading={loading}
        disabled={!termsAccepted}
        trailingIcon="chevron-left"
      />

      <View style={styles.loginRow}>
        <Text style={styles.loginHint}>لديك حساب بالفعل؟</Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="تسجيل الدخول"
          onPress={() => router.push({ pathname: '/login', params: { role } })}
          style={({ pressed }) => [styles.loginLinkButton, pressed && styles.pressed]}
        >
          <Text style={styles.loginLink}>تسجيل الدخول</Text>
        </Pressable>
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    aspectRatio: REGISTRATION_HERO_ASPECT_RATIO,
    maxHeight: 190,
    borderRadius: radius.lg,
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
    overflow: 'hidden',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  termsLink: {
    color: color.warning.DEFAULT,
    fontFamily: fontFamily.semibold,
    textDecorationLine: 'underline',
  },
  loginRow: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  loginHint: {
    ...type.caption,
    color: color.text.secondary,
    writingDirection: 'rtl',
  },
  loginLink: {
    ...type.caption,
    fontFamily: fontFamily.semibold,
    color: color.brand.navy,
    writingDirection: 'rtl',
  },
  loginLinkButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
});
