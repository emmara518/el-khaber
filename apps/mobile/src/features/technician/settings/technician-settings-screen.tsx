/**
 * Technician Settings screen (T-E) — ACCOUNT SETTINGS, distinct
 * from the public profile. Only documented surfaces: profile edit
 * entry, notifications entry, verification status entry, reviews
 * entry, support hours, logout (real session sign-out).
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/use-i18n';
import { useAuthStore } from '@/lib/auth-store';
import { Card } from '@/ui';

export default function TechnicianSettingsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('tech.settings.title')}
      </Text>
      <Text style={styles.subtitle}>{t('tech.settings.subtitle')}</Text>

      <Card background={color.surface.base} style={styles.menu}>
        <SettingsRow
          icon="👤"
          label={t('tech.settings.profile')}
          hint={t('tech.settings.profileHint')}
          onPress={() => router.push('/(technician)/profile')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="🔔"
          label={t('tech.settings.notifications')}
          soonLabel={t('profile.comingSoon')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="⭐"
          label={t('tech.reviews.title')}
          hint={t('tech.settings.reviewsHint')}
          onPress={() => router.push('/(technician)/reviews')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="✓"
          label={t('tech.settings.verification')}
          hint={t('tech.settings.verificationHint')}
          onPress={() => router.push('/(technician)/profile')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="🎧"
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
        <Text style={styles.logoutText}>🚪 {t('profile.menu.logout')}</Text>
      </Pressable>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function SettingsRow({
  icon,
  label,
  hint,
  soonLabel,
  onPress,
}: {
  icon: string;
  label: string;
  hint?: string;
  soonLabel?: string;
  onPress?: () => void;
}) {
  const interactive = typeof onPress === 'function';
  return (
    <Pressable
      accessibilityRole={interactive ? 'button' : 'text'}
      accessibilityLabel={soonLabel ? `${label}، ${soonLabel}` : hint ? `${label}. ${hint}` : label}
      onPress={onPress}
      disabled={!interactive}
      style={({ pressed }) => [styles.row, pressed && interactive && styles.pressed]}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {soonLabel ? (
        <View style={styles.soon}>
          <Text style={styles.soonText}>{soonLabel}</Text>
        </View>
      ) : interactive ? (
        <Text style={styles.chevron}>‹</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
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
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    minHeight: 56,
  },
  rowIcon: {
    fontSize: 22,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowHint: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  soon: {
    backgroundColor: color.surface.subtle,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  soonText: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
  },
  chevron: {
    color: color.text.secondary,
    fontSize: 22,
  },
  divider: {
    height: 1,
    backgroundColor: color.border.default,
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
