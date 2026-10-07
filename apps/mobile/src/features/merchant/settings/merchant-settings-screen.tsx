/**
 * Merchant Settings screen (M-B) — ACCOUNT settings, distinct from
 * the public profile: store profile entry, verification entry,
 * notifications entry, support, real logout.
 *
 * Uses the shared role-neutral header (AppHeader + PageTitle) and the
 * shared ActionButton — identical visual language to Customer and
 * Technician (no bespoke leaf header or one-off button styling).
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n/use-i18n';
import { useAuthStore } from '@/lib/auth-store';
import { ActionButton, AppHeader, Card, MenuDivider, MenuRow, PageTitle } from '@/ui';

export default function MerchantSettingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={styles.root}>
      <AppHeader
        onPressBack={() => router.replace('/(merchant)/profile')}
        onPressNotifications={() => router.push('/(merchant)/notifications')}
        onPressAvatar={() => router.push('/(merchant)/profile')}
      />
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
              onPress={() => router.push({ pathname: '/(merchant)/onboarding', params: { resume: '1' } })}
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
              icon="award"
              label={t('merchant.settings.subscription')}
              hint={t('merchant.settings.subscriptionHint')}
              onPress={() => router.push('/(merchant)/subscription')}
            />
            <MenuDivider />
            <MenuRow
              icon="headphones"
              label={t('profile.menu.support')}
              hint={t('profile.support.body')}
            />
          </Card>

          <ActionButton
            variant="destructive"
            icon="log-out"
            label={t('profile.menu.logout')}
            onPress={() => void logout()}
            style={styles.logoutAction}
          />
          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle, direction: 'rtl' },
  content: { paddingBottom: spacing[8] },
  editorial: { paddingHorizontal: spacing[5], paddingTop: spacing[4], gap: spacing[4] },
  menu: { paddingHorizontal: 0, paddingVertical: spacing[2] },
  logoutAction: { marginTop: spacing[4] },
  bottomSpacer: { height: spacing[6] },
});
