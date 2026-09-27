/**
 * Merchant Home (M-A recomposition).
 *
 * A premium operational card-stack, faithful to the approved Merchant
 * reference: identity header → welcome card → verification status →
 * product summary → recent products rail → marketplace/store context.
 *
 * Truthfulness rules enforced here:
 * - Only REAL metrics are shown (published / suspended). Draft, review
 *   and rejected product counts do NOT exist in the backend and are not
 *   invented.
 * - The marketplace-visibility surface states the honest current truth
 *   (the public marketplace read path does not exist yet); it never
 *   claims the store is publicly browsable.
 * - No views, likes, sales, revenue or activity feed are fabricated.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MerchantMetricCard } from './components/merchant-metric-card';
import { MerchantProductRail } from './components/merchant-product-rail';
import { MerchantVerificationCard } from './components/merchant-verification-card';
import { MerchantWelcomeCard } from './components/merchant-welcome-card';
import { useMerchantHomeViewModel } from './use-merchant-home-view-model';

import { HomeHeader } from '@/features/customer/home/components/home-header';
import { HomeSection } from '@/features/customer/home/components/home-section';
import { useNotificationsViewModel } from '@/features/notifications/use-notifications-view-model';
import { useI18n } from '@/i18n/use-i18n';
import { ListError, ListLoading } from '@/ui';
import { Card, Icon, type } from '@/ui';

export default function MerchantHomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useMerchantHomeViewModel();
  const notifications = useNotificationsViewModel('merchant');

  const openAddProduct = () => router.push('/(merchant)/products/new');
  const openProducts = () => router.push('/(merchant)/products');
  const openProfile = () => router.push('/(merchant)/profile');

  return (
    <View style={styles.root}>
      <HomeHeader
        avatarInitials={data?.profile.initialsAr || '·'}
        notificationCount={notifications.unreadCount}
        onPressNotifications={() => router.push('/(merchant)/notifications')}
        onPressAvatar={openProfile}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
        {status === 'error' ? (
          <ListError
            title={t('merchant.home.error')}
            message={error?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={retry}
          />
        ) : null}

        {status === 'loaded' && data !== null ? (
          <>
            <MerchantWelcomeCard
              businessNameAr={data.profile.businessNameAr}
              onAddProduct={openAddProduct}
            />

            <MerchantVerificationCard
              verification={data.profile.verification}
              headlineAr={data.profile.verificationTitleAr}
              noteAr={data.profile.verificationNoteAr}
              onPressDetails={openProfile}
            />

            <View style={styles.metrics}>
              <MerchantMetricCard
                value={data.catalog.activeProducts}
                label="منتج منشور"
                asset="verified"
                tone="success"
              />
              <MerchantMetricCard
                value={data.catalog.inactiveProducts}
                label="منتج موقوف"
                asset="error"
                tone="neutral"
              />
            </View>

            {data.recentProducts.length > 0 ? (
              <HomeSection
                eyebrow="كتالوج متجرك"
                title="منتجاتك الأخيرة"
                actionLabel="عرض الكل"
                actionAccessibilityLabel="عرض كل المنتجات"
                onPressAction={openProducts}
              >
                <MerchantProductRail
                  products={data.recentProducts}
                  onPressProduct={(product) =>
                    router.push({ pathname: '/(merchant)/products/[id]', params: { id: product.id } })
                  }
                />
              </HomeSection>
            ) : (
              <HomeSection eyebrow="كتالوج متجرك" title="منتجاتك الأخيرة">
                <Card background={color.surface.base} padded style={styles.emptyCard}>
                  <Icon name="package" size={26} color={color.text.secondary} />
                  <Text style={styles.emptyTitle}>لا توجد منتجات بعد</Text>
                  <Text style={styles.emptyBody}>
                    ابدأ ببناء كتالوج متجرك بإضافة أول منتج.
                  </Text>
                </Card>
              </HomeSection>
            )}

            <Card background={color.brand.navy} borderColor={color.brand.navy} padded style={styles.storeCard}>
              <Icon name="shopping-bag" size={22} color={color.brand.gold} />
              <View style={styles.storeCopy}>
                <Text style={styles.storeTitle}>متجر الخبير</Text>
                <Text style={styles.storeBody}>
                  {data.catalog.activeProducts > 0
                    ? 'منتجاتك جاهزة في متجرك، وسيتم عرضها للمتسوقين عند تفعيل المتجر العام.'
                    : 'أضف منتجاتك لتظهر في متجر الخبير عند تفعيل المتجر العام.'}
                </Text>
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle, direction: 'rtl' },
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  metrics: {
    flexDirection: 'row',
    direction: 'rtl',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  emptyCard: { alignItems: 'center', gap: spacing[2] },
  emptyTitle: { ...type.h3, color: color.text.primary, textAlign: 'center', writingDirection: 'rtl' },
  emptyBody: { ...type.body, color: color.text.secondary, textAlign: 'center', writingDirection: 'rtl' },
  storeCard: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[3],
  },
  storeCopy: { flex: 1, minWidth: 0, gap: 2 },
  storeTitle: { ...type.cardTitle, color: color.surface.base, textAlign: 'right', writingDirection: 'rtl' },
  storeBody: { ...type.body, color: color.border.default, textAlign: 'right', writingDirection: 'rtl' },
});
