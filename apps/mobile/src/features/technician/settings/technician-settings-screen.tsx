/**
 * Technician Settings screen (T-B) — Customer visual language.
 *
 * AppHeader → PageTitle → account menu (profile / notifications /
 * reviews / verification / support) + logout. No cinematic header.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/use-i18n';
import { useAuthStore } from '@/lib/auth-store';
import { ActionButton, AppHeader, Card, MenuDivider, MenuRow, PageTitle } from '@/ui';
import { type } from '@/ui/typography';

export default function TechnicianSettingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={styles.root}>
      <AppHeader
        onPressBack={() => router.replace('/(technician)/profile')}
        onPressNotifications={() => router.push('/(technician)/notifications')}
        onPressAvatar={() => router.push('/(technician)/profile')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageTitle eyebrow="الحساب" title={t('tech.settings.title')} body={t('tech.settings.subtitle')} />

        <Card background={color.surface.base} style={styles.menu}>
          <MenuRow
            icon="user"
            label={t('tech.settings.profile')}
            hint={t('tech.settings.profileHint')}
            onPress={() => router.push('/(technician)/profile')}
          />
          <MenuDivider />
          <MenuRow
            icon="bell"
            label={t('tech.settings.notifications')}
            hint="آخر التحديثات على طلباتك ورسائل العملاء"
            onPress={() => router.push('/(technician)/notifications')}
          />
          <MenuDivider />
          <MenuRow
            icon="star"
            label={t('tech.reviews.title')}
            hint={t('tech.settings.reviewsHint')}
            onPress={() => router.push('/(technician)/reviews')}
          />
          <MenuDivider />
          <MenuRow
            icon="shield"
            label={t('tech.settings.verification')}
            hint={t('tech.settings.verificationHint')}
            onPress={() => router.push('/(technician)/profile')}
          />
          <MenuDivider />
          <MenuRow icon="headphones" label={t('profile.menu.support')} hint={t('profile.support.body')} />
        </Card>

        <ActionButton variant="destructive" icon="log-out" label={t('profile.menu.logout')} onPress={() => void logout()} />
        <Text style={styles.note}>سيتم تسجيل خروجك وإعادتك إلى شاشة الدخول.</Text>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  menu: { paddingHorizontal: 0, paddingVertical: spacing[2] },
  note: { ...type.caption, color: color.text.secondary, textAlign: 'center', writingDirection: 'rtl' },
  bottomSpacer: { height: spacing[2] },
});
