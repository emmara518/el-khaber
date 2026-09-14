import { color, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApplianceCarouselCard } from './components/appliance-carousel-card';
import { CurrentOrderCard } from './components/current-order-card';
import { Greeting } from './components/greeting';
import { GuaranteeBanner } from './components/guarantee-banner';
import { HomeHeader } from './components/home-header';
import { LocationPill } from './components/location-pill';
import { TechnicianCarouselCard } from './components/technician-carousel-card';
import { useCustomerHomeViewModel } from './use-customer-home-view-model';

import { useI18n, type TranslationKey } from '@/i18n/use-i18n';
import { Card, HorizontalCarousel } from '@/ui';
import { QuickServiceIcon } from '@/ui/quick-service-icon';
import { SectionHeader } from '@/ui/section-header';


/**
 * Customer Home screen.
 *
 * Composes the header (navy hero), the greeting, the location pill,
 * three carousels (appliances, current orders, recommended
 * technicians), the quick services row, the gold service guarantee
 * banner, and the section headers. The screen consumes only the
 * view-model returned by `useCustomerHomeViewModel`; the data
 * source is the real API adapter (`ApiCustomerHomeDataSource`).
 */
export default function CustomerHomeScreen() {
  const { t } = useI18n();
  const { status, data, error, reload } = useCustomerHomeViewModel();

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.heroSafe}>
        <View style={styles.heroContent}>
          {data ? (
            <>
              <HomeHeader avatarInitials={data.context.avatarInitialsAr} />
              <Greeting
                line1={data.greeting.line1Ar}
                line2={data.greeting.line2Ar}
              />
              <LocationPill
                city={data.context.cityAr}
                district={data.context.districtAr}
              />
            </>
          ) : (
            <HomeHeader avatarInitials="·" />
          )}
        </View>
      </SafeAreaView>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderBody({ status, data, error, onRetry: reload, t })}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function renderBody({
  status,
  data,
  error,
  onRetry,
  t,
}: {
  status: ReturnType<typeof useCustomerHomeViewModel>['status'];
  data: ReturnType<typeof useCustomerHomeViewModel>['data'];
  error: ReturnType<typeof useCustomerHomeViewModel>['error'];
  onRetry: () => void;
  t: (key: TranslationKey) => string;
}) {
  if (status === 'loading') {
    return (
      <Card background={color.surface.base} padded style={styles.stateCard}>
        <Text style={styles.stateText}>…</Text>
      </Card>
    );
  }
  if (status === 'error' || !data) {
    return (
      <Card background={color.surface.base} padded style={styles.stateCard}>
        <Text style={styles.stateText}>
          {error ? error.message : t('placeholder.body')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('state.retry')}
          onPress={onRetry}
          style={styles.retryBtn}
        >
          <Text style={styles.retryText}>{t('state.retry')}</Text>
        </Pressable>
      </Card>
    );
  }
  return (
    <>
      {/* Appliances carousel */}
      <SectionHeader titleKey="home.appliances" showAll />
      <HorizontalCarousel
        data={data.appliances}
        keyExtractor={(item) => item.slug}
        renderItem={(item) => <ApplianceCarouselCard item={item} />}
      />

      {/* Quick services row */}
      <SectionHeader titleKey="home.quickServices" />
      <View style={styles.quickServicesRow}>
        {data.quickServices.map((item) => (
          <QuickServiceIcon key={item.id} item={item} />
        ))}
      </View>

      {/* Gold service guarantee banner */}
      <View style={styles.guaranteeWrap}>
        <GuaranteeBanner
          title={data.guarantee.titleAr}
          description={data.guarantee.descriptionAr}
          cta={data.guarantee.ctaAr}
        />
      </View>

      {/* Current orders */}
      <SectionHeader titleKey="home.currentOrders" showAll />
      <View style={styles.ordersList}>
        {data.currentOrders.map((order) => (
          <CurrentOrderCard key={order.id} order={order} />
        ))}
      </View>

      {/* Recommended technicians */}
      <SectionHeader titleKey="home.recommendedTechnicians" showAll />
      <HorizontalCarousel
        data={data.recommendedTechnicians}
        keyExtractor={(item) => item.id}
        renderItem={(tech) => <TechnicianCarouselCard technician={tech} />}
      />
    </>
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
  heroContent: {
    paddingBottom: spacing[4],
  },
  scrollContent: {
    paddingBottom: spacing[6],
  },
  quickServicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: spacing[1],
  },
  guaranteeWrap: {
    marginTop: spacing[4],
  },
  ordersList: {
    gap: spacing[3],
  },
  bottomSpacer: {
    height: spacing[6],
  },
  stateCard: {
    marginTop: spacing[5],
    alignItems: 'center',
  },
  stateText: {
    color: color.text.secondary,
    fontSize: typography.size.body,
  },
  retryBtn: {
    marginTop: spacing[3],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[5],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.brand.navy,
  },
  retryText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
});
