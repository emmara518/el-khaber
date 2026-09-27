/**
 * Merchant Settings screen (M-B) — ACCOUNT settings, distinct from
 * the public profile: store profile entry, verification entry,
 * notifications entry, support, real logout.
 *
 * Internal-screen header follows the shared Customer clean pattern
 * (`CustomerHeader`): typography and shape on the navy surface — no
 * photographic/cinematic banner.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/use-i18n';
import { useAuthStore } from '@/lib/auth-store';
import { Card, Icon, MenuDivider, MenuRow, PageTitle } from '@/ui';
import { type } from '@/ui/typography';

export default function MerchantSettingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.editorial}>
        <PageTitle
          eyebrow="الحساب"
          title={t('merchant.settings.title')}
          body={t('merchant.settings.subtitle')}
        />
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
            hint={t('merchant.settings.notificationsHint')}
            onPress={() => router.push('/(merchant)/notifications')}
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
    paddingTop: spacing[6],
    gap: spacing[4],
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
    direction: 'rtl',
    gap: spacing[2],
  },
  pressed: {
    opacity: 0.75,
  },
  logoutText: {
    ...type.button,
    color: color.error.DEFAULT,
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
