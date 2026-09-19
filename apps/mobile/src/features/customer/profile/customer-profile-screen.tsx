/**
 * Customer Profile screen (Batch A).
 *
 * Identity header + service counters + menu (orders → real route,
 * notifications/subscription → honest "soon" rows, support →
 * inline hours, logout → real session sign-out). Subscription
 * business logic is explicitly out of scope (Phase-2 brief §16).
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListError, ListLoading } from '../components/list-state-view';

import { useCustomerProfileViewModel } from './use-customer-profile-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { useAuthStore } from '@/lib/auth-store';
import { Avatar, Card, Icon, MenuDivider, MenuRow, Pill } from '@/ui';
import { SceneHero } from '@/ui/cinematic';

export default function CustomerProfileScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useCustomerProfileViewModel();
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SceneHero
        compact
        asset="customer_onboarding_technician"
        eyebrow="حسابي"
        title={t('profile.title')}
        body="بياناتك وطلباتك واشتراكك في مكان واحد."
      />

      <View style={styles.editorial}>
      {status === 'loading' ? <ListLoading label={t('state.loading')} asset="technician_trust" /> : null}
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
              {data.phoneAr} · {data.memberSinceAr}
            </Text>
            <Pill
              background={color.brand.navyDeep}
              color={color.brand.goldSoft}
              accessibilityLabel={`الموقع: ${data.cityAr}، ${data.districtAr}`}
              leading={
                <Icon
                  name="map-pin"
                  size={14}
                  color={color.brand.goldSoft}
                  accessibilityLabel="الموقع"
                />
              }
            >
              {`${data.cityAr} - ${data.districtAr}`}
            </Pill>
          </Card>

          <View style={styles.stats}>
            <Card background={color.surface.base} padded style={styles.stat}>
              <Text style={styles.statNumber}>{data.activeOrdersCount}</Text>
              <Text style={styles.statLabel}>طلبات نشطة</Text>
            </Card>
            <Card background={color.surface.base} padded style={styles.stat}>
              <Text style={styles.statNumber}>{data.completedOrdersCount}</Text>
              <Text style={styles.statLabel}>طلبات مكتملة</Text>
            </Card>
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
            <MenuRow icon="bell" label={t('profile.menu.notifications')} soonLabel={t('profile.comingSoon')} />
            <MenuDivider />
            <MenuRow icon="award" label={t('profile.menu.subscription')} onPress={() => router.push('/(customer)/subscription')} />
            <MenuDivider />
            <MenuRow icon="headphones" label={t('profile.menu.support')} hint={data.supportHoursAr} />
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
        </>
      ) : null}
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
    marginBottom: spacing[4],
  },
  hero: {
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: radius.lg,
  },
  name: {
    color: color.surface.base,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
  },
  meta: {
    color: color.brand.goldSoft,
    fontSize: typography.size.body,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
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
  },
  menu: {
    marginTop: spacing[4],
    paddingHorizontal: 0,
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
