/**
 * Technician Settings screen (T-B) — ACCOUNT settings
 * (profile entry, reviews, verification status, notifications
 * placeholder, support, real logout).
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/use-i18n';
import { useAuthStore } from '@/lib/auth-store';
import { Card, Icon, MenuDivider, MenuRow } from '@/ui';
import { SceneHero } from '@/ui/cinematic';

export default function TechnicianSettingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SceneHero
        compact
        asset="technician_profile_hero"
        eyebrow="الحساب"
        title={t('tech.settings.title')}
        body={t('tech.settings.subtitle')}
      />

      <View style={styles.editorial}>
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
          soonLabel={t('profile.comingSoon')}
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
