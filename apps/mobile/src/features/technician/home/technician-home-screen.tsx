/**
 * Technician Home screen (T-A) — operational starting point.
 *
 * Navy hero (identity + availability + rating) → verification card
 * → today's counts → incoming preview (presentation only, "عرض
 * الكل" routes to the requests tab owned by T-C) → active service
 * (no controls — T-D) → rating summary → quick actions to existing
 * tab destinations. Quick actions and "show all" navigate only to
 * routes that already exist; preview cards are non-pressable so no
 * dead interaction ships.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  verificationCopy,
  type TechnicianActiveService,
  type TechnicianIncomingPreview,
} from './technician-home-types';
import { useTechnicianHomeViewModel } from './use-technician-home-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, Card, RatingStars, SectionHeader } from '@/ui';

export default function TechnicianHomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useTechnicianHomeViewModel();

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
              {t('tech.home.error')}
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

  const verification = verificationCopy(data.profile.verification);

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.heroSafe}>
        <View style={styles.hero}>
          <Avatar
            initials={data.profile.initialsAr}
            size={64}
            background={color.brand.gold}
            foreground={color.brand.navy}
            accessibilityLabel={`الصورة الرمزية لـ ${data.profile.nameAr}`}
          />
          <View style={styles.heroText}>
            <Text style={styles.heroGreeting}>{t('tech.home.greeting')}</Text>
            <Text accessibilityRole="header" style={styles.heroName}>
              {data.profile.nameAr}
            </Text>
            <Text style={styles.heroMeta}>
              {data.profile.specialtyAr} · {data.profile.areasAr.join('، ')}
            </Text>
          </View>
          <View
            accessibilityLabel={`الحالة: ${data.profile.availabilityLabelAr}`}
            style={styles.availability}
          >
            <Text style={styles.availabilityText}>● {data.profile.availabilityLabelAr}</Text>
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
            accessibilityLabel={`${t('tech.home.verification')}: ${verification.titleAr}. ${data.profile.verificationNoteAr}`}
            style={styles.verifyRow}
          >
            <View style={styles.verifyIcon}>
              <Text style={styles.verifyIconText}>{verification.icon}</Text>
            </View>
            <View style={styles.verifyText}>
              <Text style={styles.verifyTitle}>
                {t('tech.home.verification')}: {verification.titleAr}
              </Text>
              <Text style={styles.muted}>{data.profile.verificationNoteAr}</Text>
            </View>
          </View>
        </Card>

        <SectionHeader titleKey="tech.home.today" />
        <View style={styles.stats}>
          <StatCard value={data.today.newRequests} label={t('tech.home.newRequests')} />
          <StatCard value={data.today.inProgress} label={t('tech.home.inProgress')} />
          <StatCard value={data.today.completedToday} label={t('tech.home.completedToday')} />
        </View>

        <SectionHeader
          titleKey="tech.home.incoming"
          showAll
          showAllLabel={t('tech.home.showAll')}
          onPressShowAll={() => router.push('/(technician)/orders')}
        />
        <Text style={styles.hint}>{t('tech.home.incomingHint')}</Text>
        {data.incoming.length === 0 ? (
          <Card background={color.surface.base} padded style={styles.emptyCard}>
            <Text style={styles.muted}>{t('tech.home.incomingEmpty')}</Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {data.incoming.map((item) => (
              <IncomingCard key={item.id} item={item} />
            ))}
          </View>
        )}

        <SectionHeader titleKey="tech.home.active" />
        {data.active === null ? (
          <Card background={color.surface.base} padded style={styles.emptyCard}>
            <Text style={styles.muted}>{t('tech.home.noActive')}</Text>
          </Card>
        ) : (
          <HomeActiveCard
            active={data.active}
            openLabel={t('tech.active.openFromDetail')}
          />
        )}

        <SectionHeader titleKey="tech.home.rating" />
        <Card background={color.surface.base} padded style={styles.ratingCard}>
          <RatingStars rating={data.profile.rating} reviewCount={data.profile.reviewCount} />
          <Text style={styles.muted}>
            {data.profile.reviewCount} {t('tech.home.reviews')}
          </Text>
        </Card>

        <SectionHeader titleKey="tech.home.actions" />
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tech.home.orders')}
            onPress={() => router.push('/(technician)/orders')}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionText}>{t('tech.home.orders')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tech.home.messages')}
            onPress={() => router.push('/(technician)/messages')}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>{t('tech.home.messages')}</Text>
          </Pressable>
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

function HomeActiveCard({
  active,
  openLabel,
}: {
  active: TechnicianActiveService;
  openLabel: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`إدارة الخدمة النشطة: ${active.taskAr}، ${active.statusLabelAr}`}
      onPress={() =>
        router.push({ pathname: '/(technician)/active-service', params: { id: active.id } })
      }
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card background={color.brand.navy} borderColor={color.brand.navy} padded style={styles.active}>
        <Text style={styles.activeTask}>{active.taskAr}</Text>
        <Text style={styles.activeMeta}>
          {active.customerNameAr} · {active.applianceAr}
        </Text>
        <Text style={styles.activeMeta}>{active.startedAr} · {active.statusLabelAr}</Text>
        <Text style={styles.activeCta}>{openLabel} ‹</Text>
      </Card>
    </Pressable>
  );
}

function IncomingCard({ item }: { item: TechnicianIncomingPreview }) {
  return (
    <Card background={color.surface.base} padded style={styles.incoming}>
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`طلب وارد من ${item.customerNameAr}: ${item.applianceAr}، ${item.problemAr}، ${item.timeAr}`}
      >
        <View style={styles.incomingTop}>
          <Text style={styles.incomingCustomer}>{item.customerNameAr}</Text>
          <Text style={styles.incomingTime}>{item.timeAr}</Text>
        </View>
        <Text style={styles.incomingProblem}>
          {item.applianceAr} · {item.problemAr}
        </Text>
      </View>
    </Card>
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
  availability: {
    backgroundColor: color.brand.navyDeep,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  availabilityText: {
    color: color.success.DEFAULT,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
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
  hint: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginBottom: spacing[3],
    textAlign: 'right',
  },
  emptyCard: {
    alignItems: 'center',
  },
  list: {
    gap: spacing[3],
  },
  incoming: {
    gap: spacing[1],
  },
  incomingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  incomingCustomer: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  incomingTime: {
    color: color.brand.navy,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  incomingProblem: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  active: {
    gap: spacing[1],
  },
  activeTask: {
    color: color.surface.base,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  activeMeta: {
    color: color.brand.goldSoft,
    fontSize: typography.size.body,
    textAlign: 'right',
  },
  activeCta: {
    color: color.brand.gold,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    marginTop: spacing[2],
    textAlign: 'left',
  },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    minHeight: 60,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
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
