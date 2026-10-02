/**
 * Technician Home — Customer visual language + Technician role content.
 *
 * AppHeader (navy identity bar) → Welcome Hero (the ONLY role-specific
 * hero, approved `toolbox` asset) → operational metrics (real
 * /technician/stats) → current service → new requests → quick actions.
 * No cinematic page sections; every card uses the shared Customer system.
 */

import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { verificationCopy } from './technician-home-types';
import { useTechnicianHomeViewModel } from './use-technician-home-view-model';

import { useNotificationsViewModel } from '@/features/notifications/use-notifications-view-model';
import { useI18n } from '@/i18n/use-i18n';
import { joinNonEmpty } from '@/lib/api-format';
import {
  ActionButton,
  AppHeader,
  ApplianceThumb,
  BrandImage,
  Card,
  Icon,
  ListError,
  ListLoading,
  PageTitle,
  SectionHeading,
  StatTile,
  StatusBadge,
  statusBrandAsset,
  type BrandAssetName,
} from '@/ui';
import { fontFamily, type } from '@/ui/typography';

const QUICK_ACTIONS: ReadonlyArray<{
  id: string;
  label: string;
  asset: BrandAssetName;
  target: '/(technician)/orders' | '/(technician)/services' | '/(technician)/messages' | '/(technician)/reviews';
}> = [
  { id: 'orders', label: 'الطلبات', asset: 'my-requests', target: '/(technician)/orders' },
  { id: 'services', label: 'الخدمات', asset: 'maintenance', target: '/(technician)/services' },
  { id: 'messages', label: 'الرسائل', asset: 'messages', target: '/(technician)/messages' },
  { id: 'reviews', label: 'التقييمات', asset: 'rate-us', target: '/(technician)/reviews' },
];

export default function TechnicianHomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry, availabilitySaving, availabilityError, setAvailability } = useTechnicianHomeViewModel();
  const notifications = useNotificationsViewModel('technician');

  if (status === 'loading' || data === null) {
    return (
      <View style={styles.root}>
        <AppHeader onPressNotifications={() => router.push('/(technician)/notifications')} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PageTitle eyebrow="مساحة العمل" title={t('tech.home.today')} />
          <ListLoading label={t('state.loading')} brandAsset="toolbox" />
        </ScrollView>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.root}>
        <AppHeader onPressNotifications={() => router.push('/(technician)/notifications')} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <PageTitle eyebrow="مساحة العمل" title={t('tech.home.today')} />
          <ListError
            title={t('tech.home.error')}
            message={error?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={retry}
          />
        </ScrollView>
      </View>
    );
  }

  const verification = verificationCopy(data.profile.verification);
  const active = data.active;

  return (
    <View style={styles.root}>
      <AppHeader
        availabilityLabel={data.profile.available ? data.profile.availabilityLabelAr : undefined}
        avatarInitials={data.profile.initialsAr}
        notificationCount={notifications.unreadCount}
        onPressNotifications={() => router.push('/(technician)/notifications')}
        onPressAvatar={() => router.push('/(technician)/profile')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Hero — the only role-specific hero */}
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>مرحبًا بك</Text>
            <Text accessibilityRole="header" style={styles.heroTitle}>
              أهلًا بك في عملك
            </Text>
            <Text style={styles.heroBody}>
              تلقّ الطلبات الجديدة، تابع مهامك، وقدّم أفضل خدمة لعملائك.
            </Text>
          </View>
          <View style={styles.heroArt} accessibilityRole="image" accessibilityLabel="عدة العمل">
            <BrandImage name="toolbox" size={148} />
          </View>
        </View>

        {/* Operational metrics — real /technician/stats */}
        <View style={styles.statsRow}>
          <StatTile icon="clipboard" value={data.today.newRequests} label={t('tech.home.newRequests')} />
          <StatTile icon="tool" value={data.today.inProgress} label={t('tech.home.inProgress')} />
          <StatTile icon="navigation" value={data.today.onTheWay} label="في الطريق" />
          <StatTile icon="check-circle" value={data.today.completedToday} label={t('tech.home.completedToday')} />
        </View>

        {/* Availability (WP-4) — technician-controlled, server-authoritative.
            A controlled on/off Switch (not a large CTA): the state is read
            from the server, the write is real, and it is disabled while a
            mutation is in flight. No schedule, no time range. */}
        <View style={styles.section}>
          <SectionHeading
            title={t('tech.home.availability.title')}
            body={t('tech.home.availability.body')}
          />
          <Card background={color.surface.base} padded style={styles.availabilityCard}>
            <View style={styles.availabilityRow}>
              <View style={styles.availabilityCopy}>
                <View style={styles.availabilityLabelRow}>
                  <View
                    style={[styles.availabilityDot, data.profile.available ? styles.dotOn : styles.dotOff]}
                  />
                  <Text style={styles.availabilityValue}>
                    {data.profile.available
                      ? t('tech.home.availability.on')
                      : t('tech.home.availability.off')}
                  </Text>
                </View>
                {availabilitySaving ? (
                  <Text style={styles.availabilityHint}>{t('tech.home.availability.saving')}</Text>
                ) : null}
              </View>
              <Switch
                value={data.profile.available}
                onValueChange={(next) => setAvailability(next)}
                disabled={availabilitySaving}
                accessibilityLabel={t('tech.home.availability.title')}
                accessibilityState={{ checked: data.profile.available, disabled: availabilitySaving }}
                trackColor={{ false: color.border.default, true: color.brand.goldSoft }}
                thumbColor={data.profile.available ? color.brand.gold : color.surface.base}
                ios_backgroundColor={color.border.default}
              />
            </View>
            {availabilityError !== null ? (
              <Text accessibilityRole="alert" style={styles.inlineError}>
                {availabilityError}
              </Text>
            ) : null}
          </Card>
        </View>

        {/* Current service */}
        <View style={styles.section}>
          <SectionHeading
            title="خدمتك الحالية"
            actionLabel="عرض الكل"
            actionAccessibilityLabel="عرض كل الطلبات"
            onPressAction={() => router.push('/(technician)/orders')}
          />
          {active ? (
            <Card background={color.surface.base} padded style={styles.activeCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`الطلب النشط: ${active.taskAr}`}
                onPress={() => router.push({ pathname: '/(technician)/active-service', params: { id: active.id } })}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <View style={styles.activeRow}>
                  <ApplianceThumb slug={active.applianceSlug} size={64} />
                  <View style={styles.activeCopy}>
                    <StatusBadge status="in_progress" label={active.statusLabelAr} icon={statusBrandAsset('in_progress')} />
                    <Text style={styles.activeTitle} numberOfLines={2}>
                      {active.applianceAr} · {active.taskAr}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {joinNonEmpty([active.customerNameAr, active.startedAr])}
                    </Text>
                  </View>
                </View>
              </Pressable>
              <ActionButton
                icon="arrow-left"
                label="متابعة الخدمة"
                onPress={() => router.push({ pathname: '/(technician)/active-service', params: { id: active.id } })}
                style={styles.activeAction}
              />
            </Card>
          ) : (
            <Card background={color.surface.base} padded>
              <Text style={styles.body}>{t('tech.home.noActive')}</Text>
            </Card>
          )}
        </View>

        {/* New requests */}
        <View style={styles.section}>
          <SectionHeading
            title={t('tech.home.incoming')}
            body={t('tech.home.incomingHint')}
            actionLabel={t('tech.home.showAll')}
            actionAccessibilityLabel="عرض كل الطلبات"
            onPressAction={() => router.push('/(technician)/orders')}
          />
          {data.incoming.length === 0 ? (
            <Card background={color.surface.base} padded>
              <Text style={styles.body}>{t('tech.home.incomingEmpty')}</Text>
            </Card>
          ) : (
            <View style={styles.stack}>
              {data.incoming.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`فتح طلب ${item.customerNameAr}: ${item.problemAr}`}
                  onPress={() => router.push({ pathname: '/(technician)/orders/[id]', params: { id: item.id } })}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <Card background={color.surface.base} padded style={styles.requestCard}>
                    <View style={styles.activeRow}>
                      <ApplianceThumb slug={item.applianceSlug} size={56} />
                      <View style={styles.activeCopy}>
                        <View style={styles.requestTop}>
                          <StatusBadge status="pending" label="طلب جديد" icon={statusBrandAsset('pending')} />
                          <Text style={styles.time}>{item.timeAr}</Text>
                        </View>
                        <Text style={styles.activeTitle} numberOfLines={2}>
                          {item.applianceAr} · {item.problemAr}
                        </Text>
                        <Text style={styles.meta} numberOfLines={1}>
                          {item.customerNameAr}
                        </Text>
                      </View>
                      <Icon name="chevron-left" size={20} color={color.brand.navy} />
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <SectionHeading title="إجراءات سريعة" />
          <View style={styles.quickRow}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.id}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                onPress={() => router.push(action.target)}
                style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
              >
                <View style={styles.quickIcon}>
                  <BrandImage name={action.asset} size={30} />
                </View>
                <Text style={styles.quickLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Verification summary */}
        <View style={styles.section}>
          <SectionHeading title={verification.titleAr} body={data.profile.verificationNoteAr} />
          <ActionButton
            variant="secondary"
            icon="user"
            label="إدارة الملف"
            onPress={() => router.push('/(technician)/profile')}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[5] },
  hero: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    backgroundColor: color.brand.goldSoft,
    borderRadius: radius.xl,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    overflow: 'hidden',
    ...shadow.medium,
  },
  heroCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  heroEyebrow: { ...type.label, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  heroTitle: { ...type.h1, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  heroBody: { ...type.body, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl', opacity: 0.9 },
  heroArt: { width: 140, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', direction: 'rtl', gap: spacing[2] },
  availabilityCard: { gap: spacing[3] },
  availabilityRow: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  availabilityCopy: { flex: 1, minWidth: 0, gap: 2 },
  availabilityLabelRow: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[2] },
  availabilityDot: { width: 12, height: 12, borderRadius: radius.pill },
  dotOn: { backgroundColor: color.success.DEFAULT },
  dotOff: { backgroundColor: color.text.secondary },
  availabilityValue: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  availabilityHint: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  inlineError: { ...type.caption, color: color.error.DEFAULT, textAlign: 'right', writingDirection: 'rtl' },
  section: { gap: spacing[3] },
  stack: { gap: spacing[3] },
  activeCard: { gap: spacing[3] },
  activeRow: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[3] },
  activeCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  activeTitle: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  meta: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  activeAction: { marginTop: spacing[1] },
  requestCard: { padding: spacing[3] },
  requestTop: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  time: { ...type.caption, color: color.text.secondary },
  quickRow: { flexDirection: 'row', direction: 'rtl', gap: spacing[2] },
  quickTile: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    ...shadow.low,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: color.brand.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { ...type.caption, color: color.brand.navy, textAlign: 'center', fontFamily: fontFamily.semibold },
  body: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  bottomSpacer: { height: spacing[2] },
  pressed: { opacity: 0.85 },
});
