/**
 * Merchant Home screen (M-A) — operational landing for merchants.
 *
 * Navy hero (identity + city) → verification card → catalog counts
 * (consistent arithmetic, no financial metrics) → store actions
 * (products/add/profile entries + subscription entry, all real
 * routes or explicit placeholders) → bottom nav. Product CRUD,
 * checkout, orders, payments: NOT in this batch — destinations are
 * explicit placeholders.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { merchantVerificationCopy } from './merchant-home-types';
import { useMerchantHomeViewModel } from './use-merchant-home-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, Card } from '@/ui';

export default function MerchantHomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useMerchantHomeViewModel();

  if (status === 'loading') {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.heroSafe}>
          <View style={styles.heroLoading}>
            <Text style={styles.heroName}>…</Text>
          </View>
        </SafeAreaView>
        <View style={styles.stateWrap}>
          <Text style={styles.muted}>{t('state.loading')}</Text>
        </View>
      </View>
    );
  }

  if (status === 'error' || data === null) {
    return (
      <View style={styles.root}>
        <SafeAreaView edges={['top']} style={styles.heroSafe} />
        <View style={styles.stateWrap}>
          <Card background={color.surface.base} padded style={styles.stateCard}>
            <Text accessibilityRole="alert" style={styles.stateTitle}>
              {t('merchant.home.error')}
            </Text>
            <Text style={styles.muted}>{error?.message ?? ''}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('state.retry')}
              onPress={retry}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
            >
              <Text style={styles.retryText}>{t('state.retry')}</Text>
            </Pressable>
          </Card>
        </View>
      </View>
    );
  }

  const verification = merchantVerificationCopy(data.profile.verification);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.heroSafe}>
        <View style={styles.hero}>
          <Avatar
            initials={data.profile.initialsAr}
            size={64}
            background={color.brand.gold}
            foreground={color.brand.navy}
            accessibilityLabel={`شعار ${data.profile.businessNameAr}`}
          />
          <View style={styles.heroText}>
            <Text style={styles.heroGreeting}>{t('merchant.home.greeting')}</Text>
            <Text accessibilityRole="header" style={styles.heroName}>
              {data.profile.businessNameAr}
            </Text>
            <Text style={styles.heroMeta}>📍 {data.profile.cityAr}</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card
          background={color.surface.base}
          padded
          style={data.profile.verification === 'verified' ? styles.verifyOk : styles.verifyBase}
        >
          <View
            accessibilityLabel={`${t('merchant.home.verification')}: ${verification.titleAr}. ${data.profile.verificationNoteAr}`}
            style={styles.verifyRow}
          >
            <View style={styles.verifyIcon}>
              <Text style={styles.verifyIconText}>{verification.icon}</Text>
            </View>
            <View style={styles.verifyText}>
              <Text style={styles.verifyTitle}>
                {t('merchant.home.verification')}: {verification.titleAr}
              </Text>
              <Text style={styles.muted}>{data.profile.verificationNoteAr}</Text>
            </View>
          </View>
        </Card>

        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('merchant.home.catalog')}
        </Text>
        <View style={styles.stats}>
          <StatCard value={data.catalog.totalProducts} label={t('merchant.home.total')} />
          <StatCard value={data.catalog.activeProducts} label={t('merchant.home.active')} />
          <StatCard value={data.catalog.inactiveProducts} label={t('merchant.home.inactive')} />
        </View>

        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('merchant.home.actions')}
        </Text>
        <View style={styles.actions}>
          <ActionCard
            icon="📦"
            label={t('merchant.home.products')}
            onPress={() => router.push('/(merchant)/products')}
          />
          <ActionCard
            icon="➕"
            label={t('merchant.home.addProduct')}
            onPress={() => router.push('/(merchant)/products')}
          />
        </View>
        <View style={styles.actions}>
          <ActionCard
            icon="⚙️"
            label={t('merchant.home.profile')}
            onPress={() => router.push('/(merchant)/settings')}
          />
          {data.subscription !== null ? (
            <ActionCard
              icon="⭐"
              label={`${t('merchant.home.subscription')}: ${data.subscription.planNameAr}`}
              hint={data.subscription.statusAr}
              onPress={() => router.push('/(merchant)/settings')}
            />
          ) : null}
        </View>
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <Card background={color.surface.base} padded style={styles.stat}>
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function ActionCard({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: string;
  label: string;
  hint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}، ${hint}` : label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <View style={styles.actionText}>
        <Text style={styles.actionLabel} numberOfLines={1}>
          {label}
        </Text>
        {hint ? <Text style={styles.actionHint}>{hint}</Text> : null}
      </View>
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
  },
  heroSafe: {
    backgroundColor: color.brand.navy,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: color.brand.navy,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[5],
  },
  heroLoading: {
    backgroundColor: color.brand.navy,
    padding: spacing[5],
  },
  heroText: {
    flex: 1,
  },
  heroGreeting: {
    color: color.brand.goldSoft,
    fontSize: typography.size.caption,
  },
  heroName: {
    color: color.surface.base,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  heroMeta: {
    color: color.brand.goldSoft,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
  },
  verifyBase: {
    borderWidth: 1,
  },
  verifyOk: {
    borderWidth: 1,
    borderColor: color.success.DEFAULT,
  },
  verifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  verifyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.success.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyIconText: {
    color: color.success.DEFAULT,
    fontSize: 20,
    fontWeight: typography.weight.bold,
  },
  verifyText: {
    flex: 1,
  },
  verifyTitle: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  muted: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  sectionTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    marginTop: spacing[5],
    marginBottom: spacing[3],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  stats: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  statNumber: {
    color: color.text.primary,
    fontSize: typography.size.h1,
    fontWeight: typography.weight.bold,
  },
  statLabel: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    minHeight: 64,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionText: {
    flex: 1,
  },
  actionLabel: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    textAlign: 'right',
  },
  actionHint: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    textAlign: 'right',
  },
  chevron: {
    color: color.text.secondary,
    fontSize: 20,
  },
  pressed: {
    opacity: 0.75,
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    alignItems: 'center',
  },
  stateCard: {
    width: '100%',
    alignItems: 'center',
    gap: spacing[2],
  },
  stateTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
  },
  retry: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  retryText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
