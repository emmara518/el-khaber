/**
 * Account Type Selection — exactly three roles (عميل / فني / تاجر).
 *
 * Part of the registration journey (docs/03_USER_FLOWS.md §4): the
 * chosen role is an intent carried into login/register params. It
 * is never treated as the authenticated authority.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthLink } from '../src/features/auth/components/auth-feedback';
import { AuthScreen } from '../src/features/auth/components/auth-screen';
import { ROLE_OPTIONS, RoleCard } from '../src/features/auth/components/role-card';
import { sceneAssets } from '../src/ui/scene-assets';

import type { Role } from '@khabir/shared-types';

export default function AccountTypeRoute() {
  const router = useRouter();
  const [selected, setSelected] = useState<Role | null>(null);

  return (
    <AuthScreen title="اختر نوع حسابك" subtitle="اختر الدور المناسب لك للمتابعة إلى تسجيل الدخول أو إنشاء حساب">
      <Image
        source={sceneAssets.customer_onboarding_diagnosis}
        accessibilityRole="image"
        accessibilityLabel="مشهد سينمائي لرحلة التشخيص واختيار المسار المناسب في الخبير"
        resizeMode="cover"
        style={styles.visual}
      />
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="اختيار نوع الحساب"
        style={styles.group}
      >
        {ROLE_OPTIONS.map((option) => (
          <RoleCard
            key={option.role}
            option={option}
            selected={selected === option.role}
            onSelect={setSelected}
          />
        ))}
      </View>
      <AuthButton
        label="متابعة"
        disabled={selected === null}
        onPress={() => {
          if (selected !== null) {
            router.push({ pathname: '/register', params: { role: selected } });
          }
        }}
      />
      <View style={styles.loginRow}>
        <Text style={styles.loginHint}>لديك حساب بالفعل؟</Text>
        <AuthLink
          label="تسجيل الدخول"
          onPress={() =>
            router.push({
              pathname: '/login',
              params: selected !== null ? { role: selected } : undefined,
            })
          }
        />
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  visual: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: color.brand.navy,
  },
  group: {
    gap: spacing[3],
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  loginHint: {
    color: color.text.secondary,
    fontSize: typography.size.body,
  },
});
