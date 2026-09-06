/**
 * Shell placeholder screen for Technician / Merchant Phase-1 shells.
 *
 * SHELL ONLY: marks the destination as structural scaffolding whose
 * product functionality ships in a later phase. Includes sign-out so
 * every shell is verifiably exitable during QA.
 */

import { color, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/features/auth/components/auth-feedback';
import { useAuthStore } from '@/lib/auth-store';
import { Card } from '@/ui/card';

export function ShellPlaceholder({
  roleAr,
  titleAr,
}: {
  roleAr: string;
  titleAr: string;
}) {
  const logout = useAuthStore((s) => s.logout);
  return (
    <View style={styles.root}>
      <Card background={color.surface.base} padded style={styles.card}>
        <Text accessibilityRole="header" style={styles.kicker}>
          {roleAr} · {titleAr}
        </Text>
        <Text style={styles.title}>هذه المساحة قيد التجهيز</Text>
        <Text style={styles.body}>
          هيكل التطبيق جاهز، وسيتم تفعيل شاشات هذه المرحلة في مهمة لاحقة.
        </Text>
        <View style={styles.action}>
          <AuthButton label="تسجيل الخروج" onPress={() => void logout()} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
  },
  card: {
    alignItems: 'center',
  },
  kicker: {
    color: color.brand.gold,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  body: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[3],
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  action: {
    marginTop: spacing[5],
    width: '100%',
  },
});
