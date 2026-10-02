/**
 * Customer Profile screen (Batch A).
 *
 * Identity header + service counters + menu (orders → real route,
 * notifications/subscription → honest "soon" rows, support →
 * inline hours, logout → real session sign-out). Subscription
 * business logic is explicitly out of scope (Phase-2 brief §16).
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';



import { profileLocationLabel } from './location-label';
import { useCustomerProfileViewModel } from './use-customer-profile-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { joinNonEmpty } from '@/lib/api-format';
import { useAuthStore } from '@/lib/auth-store';
import { ActionButton, AppHeader, Avatar, Card, Icon, ListError, ListLoading, MenuDivider, MenuRow, PageTitle, Pill, StatTile, type } from '@/ui';

export default function CustomerProfileScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useCustomerProfileViewModel();
  const logout = useAuthStore((s) => s.logout);

  // The API exposes no customer city/district yet (reported gap). Build the
  // location line from real, non-empty parts only — never a dangling " - ".
  const locationLabel = data !== null ? profileLocationLabel(data.cityAr, data.districtAr) : null;

  return (
    <View style={styles.root}>
      <AppHeader
        onPressNotifications={() => router.push('/(customer)/notifications')}
        onPressAvatar={() => router.push('/(customer)/profile')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.editorial}>
        <PageTitle eyebrow="حسابي" title={t('profile.title')} body="بياناتك وطلباتك واشتراكك في مكان واحد." />
      {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {status === 'error' ? (
        <ListError
          asset="fault_empty"
          title={t('requests.error.title')}
          message={error?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={retry}
        />
      ) : null}
      {status === 'loaded' && data ? (
        <>
          <Card background={color.brand.navy} borderColor={color.brand.navy} padded style={styles.hero}>
            <Avatar
              initials={data.initialsAr}
              size={72}
              background={color.brand.gold}
              foreground={color.brand.navy}
              accessibilityLabel={`الصورة الرمزية لـ ${data.displayNameAr}`}
            />
            <Text style={styles.name}>{data.displayNameAr}</Text>
            <Text style={styles.meta}>
              {joinNonEmpty([data.phoneAr, data.memberSinceAr])}
            </Text>
            <Pill
              background={color.brand.navyDeep}
              color={color.brand.goldSoft}
              accessibilityLabel={
                locationLabel !== null ? `الموقع: ${locationLabel}` : t('profile.location.none')
              }
              leading={
                <Icon
                  name="map-pin"
                  size={14}
                  color={color.brand.goldSoft}
                  accessibilityLabel="الموقع"
                />
              }
            >
              {locationLabel ?? t('profile.location.none')}
            </Pill>
          </Card>

          <View style={styles.stats}>
            <StatTile icon="clipboard" value={data.activeOrdersCount} label="طلبات نشطة" />
            <StatTile icon="check-circle" value={data.completedOrdersCount} label="طلبات مكتملة" />
          </View>

          <Card background={color.surface.base} style={styles.menu}>
            <MenuRow
              icon="clipboard"
              label={t('profile.menu.orders')}
              onPress={() => router.push('/(customer)/requests')}
            />
            <MenuDivider />
            <MenuRow
              icon="search"
              label={t('discovery.title')}
              onPress={() => router.push('/(customer)/find-technician')}
            />
            <MenuDivider />
            <MenuRow
              icon="bell"
              label={t('profile.menu.notifications')}
              onPress={() => router.push('/(customer)/notifications')}
            />
            <MenuDivider />
            <MenuRow icon="award" label={t('profile.menu.subscription')} onPress={() => router.push('/(customer)/subscription')} />
            <MenuDivider />
            <MenuRow icon="headphones" label={t('profile.menu.support')} hint={data.supportHoursAr} />
          </Card>

          <ActionButton
            variant="destructive"
            icon="log-out"
            label={t('profile.menu.logout')}
            onPress={() => void logout()}
            style={styles.logoutAction}
          />
        </>
      ) : null}
        <View style={styles.bottomSpacer} />
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
    direction: 'rtl',
  },
  content: {
    paddingBottom: spacing[8],
  },
  editorial: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
  },
  title: {
    ...type.h2,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing[4],
  },
  hero: {
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: radius.lg,
  },
  name: {
    ...type.h2,
    color: color.surface.base,
  },
  meta: {
    ...type.body,
    color: color.brand.goldSoft,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  logoutAction: {
    marginTop: spacing[4],
  },
  menu: {
    marginTop: spacing[4],
    paddingHorizontal: 0,
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
