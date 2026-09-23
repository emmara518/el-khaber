import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ListEmpty, ListError } from '../components/list-state-view';

import { ApplianceCard } from './components/appliance-card';
import { CurrentOrderCard } from './components/current-order-card';
import { HomeHeader } from './components/home-header';
import { HomeHero } from './components/home-hero';
import { HomeSearch } from './components/home-search';
import { HomeSection } from './components/home-section';
import { HomeSkeleton } from './components/home-skeleton';
import { RecommendedTechnicianCard } from './components/recommended-technician-card';
import { ServiceCard } from './components/service-card';
import { StorePreviewCard } from './components/store-preview-card';
import { TrustSection } from './components/trust-section';
import { useCustomerHomeViewModel } from './use-customer-home-view-model';

import type { QuickServiceItem } from './data/customer-home-types';
import type { BrandAssetName } from '@/ui/brand-assets';

import { useI18n } from '@/i18n/use-i18n';

/** Service icon → approved brand mark (same vocabulary as the tiles). */
const SERVICE_ASSET: Record<QuickServiceItem['icon'], BrandAssetName> = {
  wrench: 'repair',
  search: 'certified-technician',
  clipboard: 'book-service',
  package: 'on-the-way',
};

/** One-line "why it matters" per real service shortcut (presentation copy). */
const SERVICE_BODY: Record<string, string> = {
  'track-order': 'تابع حالة طلبك لحظة بلحظة',
  'request-maintenance': 'اطلب فنيًا لصيانة جهازك',
  'search-technician': 'ابحث عن فني حسب التخصص',
  'fix-fault': 'دليل يساعدك على فهم العطل',
};

export default function CustomerHomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, reload } = useCustomerHomeViewModel();

  const go = (route: 'maintenance' | 'find-technician' | 'requests') =>
    router.replace(
      route === 'maintenance'
        ? '/(customer)/maintenance'
        : route === 'requests'
          ? '/(customer)/requests'
          : '/(customer)/find-technician',
    );

  return (
    <View style={styles.root}>
      <HomeHeader
        avatarInitials={data?.context.avatarInitialsAr ?? '·'}
        onPressNotifications={() => Alert.alert('الإشعارات', 'ستتوفر الإشعارات في تحديث قادم.')}
        onPressAvatar={() => router.replace('/(customer)/profile')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HomeHero
          titleLine1="صيانة أجهزتك"
          titleLine2="بين أيدي خبراء"
          body="فنيون موثوقون، تشخيص واضح، وضمان على الإصلاح."
          primaryLabel="اطلب فني الآن"
          onPressPrimary={() => go('find-technician')}
          secondaryLabel="استكشف الخدمات"
          onPressSecondary={() => go('maintenance')}
        />

        <View style={styles.searchWrap}>
          <HomeSearch
            placeholder="ابحث عن جهاز أو خدمة"
            onPress={() => go('find-technician')}
          />
        </View>

        {status === 'loading' ? <HomeSkeleton label={t('state.loading')} /> : null}
        {status === 'error' || (status !== 'loading' && !data) ? (
          <ListError
            title="تعذّر تحميل صفحتك"
            message={error?.message ?? t('placeholder.body')}
            retryLabel={t('state.retry')}
            onRetry={reload}
          />
        ) : null}

        {status !== 'loading' && status !== 'error' && data ? (
          <>
            {data.appliances.length > 0 ? (
              <HomeSection
                eyebrow="ابدأ من الجهاز"
                title="أجهزة شائعة"
                body="اختر الجهاز لاستكشاف خيارات العناية به."
              >
                <View style={styles.applianceRow}>
                  {data.appliances.map((item) => (
                    <ApplianceCard key={item.slug} item={item} onPress={() => go('maintenance')} />
                  ))}
                </View>
              </HomeSection>
            ) : null}

            <HomeSection title="خدمات الخبير" eyebrow="كيف نساعدك؟">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.serviceRail}
              >
                {data.quickServices.map((item) => (
                  <ServiceCard
                    key={item.id}
                    title={item.titleAr}
                    body={SERVICE_BODY[item.id] ?? ''}
                    asset={SERVICE_ASSET[item.icon]}
                    onPress={() => go(item.route)}
                  />
                ))}
              </ScrollView>
            </HomeSection>

            <View style={styles.storeWrap}>
              <StorePreviewCard
                onPressStore={() =>
                  Alert.alert('متجر الخبير', 'المتجر قيد التجهيز وسيتوفر قريبًا.')
                }
              />
            </View>

            <HomeSection title="ليه الخبير؟" eyebrow="ثقة مبنية على الواقع">
              <TrustSection />
            </HomeSection>

            <HomeSection
              title={t('home.recommendedTechnicians')}
              eyebrow="اكتشف الخيارات"
              actionLabel="استكشف الفنيين"
              actionAccessibilityLabel="استكشف كل الفنيين"
              onPressAction={() => go('find-technician')}
            >
              {data.recommendedTechnicians.length > 0 ? (
                <View style={styles.stack}>
                  {data.recommendedTechnicians.map((technician) => (
                    <RecommendedTechnicianCard
                      key={technician.id}
                      technician={technician}
                      onPress={() =>
                        router.push({
                          pathname: '/(customer)/technician/[id]',
                          params: { id: technician.id },
                        })
                      }
                    />
                  ))}
                </View>
              ) : (
                <ListEmpty
                  icon="user-x"
                  iconLabel="لا يوجد فنيون"
                  title="لا يوجد فنيون مقترحون في الوقت الحالي"
                  body="يمكنك استكشاف دليل الفنيين أو العودة لاحقًا للاطلاع على الترشيحات."
                  actionLabel="استكشف الفنيين"
                  onAction={() => go('find-technician')}
                  brandAsset="no-results"
                />
              )}
            </HomeSection>

            {data.currentOrders.length > 0 ? (
              <HomeSection
                title={t('home.currentOrders')}
                eyebrow="متابعة مباشرة"
                actionLabel="عرض الطلبات"
                actionAccessibilityLabel="عرض كل الطلبات"
                onPressAction={() => go('requests')}
              >
                <View style={styles.stack}>
                  {data.currentOrders.map((order) => (
                    <CurrentOrderCard key={order.id} order={order} />
                  ))}
                </View>
              </HomeSection>
            ) : null}
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
  },
  searchWrap: { marginTop: spacing[4] },
  applianceRow: { flexDirection: 'row', direction: 'rtl', gap: spacing[2] + 2 },
  serviceRail: { flexDirection: 'row', direction: 'rtl', gap: spacing[3] },
  storeWrap: { marginTop: spacing[6] },
  stack: { gap: spacing[3] },
});
