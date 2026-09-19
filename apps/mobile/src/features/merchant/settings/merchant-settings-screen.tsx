/**
 * Merchant Settings screen (M-B) — ACCOUNT settings, distinct from
 * the public profile: store profile entry, verification entry,
 * notifications entry (honest placeholder), support, real logout.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/use-i18n';
import { useAuthStore } from '@/lib/auth-store';
import { Card, Icon, MenuDivider, MenuRow } from '@/ui';
import { SceneHero } from '@/ui/cinematic';

export default function MerchantSettingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SceneHero
        compact
        asset="merchant_dashboard_hero"
        eyebrow="الحساب"
        title={t('merchant.settings.title')}
        body={t('merchant.settings.subtitle')}
      />

      <View style={styles.editorial}>
        <Card background={color.surface.base} style={styles.menu}>
        <MenuRow
          icon="shopping-bag"
          label={t('merchant.settings.profile')}
          hint={t('merchant.settings.profileHint')}
          onPress={() => router.push('/(merchant)/profile')}
        />
        <MenuDivider />
        <MenuRow
          icon="shield"
          label={t('merchant.settings.verification')}
          hint={t('merchant.settings.verificationHint')}
          onPress={() => router.push('/(merchant)/profile')}
        />
        <MenuDivider />
        <MenuRow
          icon="edit-3"
          label={t('merchant.settings.onboarding')}
          hint={t('merchant.settings.onboardingHint')}
          onPress={() => router.push('/(merchant)/onboarding')}
        />
        <MenuDivider />
        <MenuRow
          icon="bell"
          label={t('merchant.settings.notifications')}
          soonLabel={t('profile.comingSoon')}
        />
        <MenuDivider />
        <MenuRow
          icon="headphones"
          label={t('profile.menu.support')}
          hint={t('profile.support.body')}
        />
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('profile.menu.logout')}
        onPress={() => void logout()}
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
      >
        <Icon name="log-out" size={18} color={color.error.DEFAULT} />
        <Text style={styles.logoutText}>{t('profile.menu.logout')}</Text>
      </Pressable>
        <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing[8],
  },
  editorial: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing[4],
  },
  menu: {
    paddingHorizontal: 0,
    paddingVertical: spacing[2],
  },
  logout: {
    marginTop: spacing[4],
    borderWidth: 1,
    borderColor: color.error.DEFAULT,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface.base,
    flexDirection: 'row',
    gap: spacing[2],
  },
  pressed: {
    opacity: 0.75,
  },
  logoutText: {
    color: color.error.DEFAULT,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
