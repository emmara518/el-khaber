import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListError, ListLoading } from '../components/list-state-view';

import { CurrentOrderCard } from './components/current-order-card';
import { HomeHeader } from './components/home-header';
import { LocationPill } from './components/location-pill';
import { useCustomerHomeViewModel } from './use-customer-home-view-model';

import type { ApplianceSlug } from './data/customer-home-types';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, RatingStars } from '@/ui';
import { applianceSceneAsset, SceneAction, SceneHero, SceneObject, SceneSection } from '@/ui/cinematic';

export default function CustomerHomeScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, reload } = useCustomerHomeViewModel();
  const [selectedSlug, setSelectedSlug] = useState<ApplianceSlug | null>(null);
  const selectedAppliance = data?.appliances.find((item) => item.slug === selectedSlug) ?? data?.appliances[0];
  const navigate = (route: 'maintenance' | 'find-technician' | 'requests') =>
    router.replace(
      route === 'maintenance'
        ? '/(customer)/maintenance'
        : route === 'requests'
          ? '/(customer)/requests'
          : '/(customer)/find-technician',
    );

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.navigation}>
        <HomeHeader
          avatarInitials={data?.context.avatarInitialsAr ?? '·'}
          onPressNotifications={() => Alert.alert('الإشعارات', 'ستتوفر الإشعارات في تحديث قادم.')}
        />
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SceneHero
          asset="customer_home_hero"
          eyebrow={data?.greeting.line1Ar ?? 'الخبير لمنزلك'}
          title="كل عناية يبدأ بها بيتك"
          body={data?.greeting.line2Ar ?? 'اختر جهازك، افهم العطل، وابحث عن الفني المناسب.'}
          action={<SceneAction label="اطلب صيانة" onPress={() => navigate('find-technician')} />}
        >
          {data && data.context.cityAr.length > 0 ? (
            <LocationPill city={data.context.cityAr} district={data.context.districtAr} />
          ) : null}
        </SceneHero>
        <View style={styles.editorial}>
          {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
          {status === 'error' || (status !== 'loading' && !data) ? (
            <ListError title="تعذّر تحميل صفحتك" message={error?.message ?? t('placeholder.body')} retryLabel={t('state.retry')} onRetry={reload} />
          ) : null}
          {status !== 'loading' && status !== 'error' && data ? (
            <>
              <SceneSection eyebrow="ابدأ من الجهاز" title={t('home.appliances')} body="اختر الجهاز لاستكشاف خيارات العناية به.">
                <View accessibilityRole="radiogroup" accessibilityLabel={t('home.appliances')} style={styles.objects}>
                  {data.appliances.map((item) => (
                    <SceneObject
                      key={item.slug}
                      asset={applianceSceneAsset(item.slug)}
                      title={item.titleAr}
                      selected={selectedAppliance?.slug === item.slug}
                      onPress={() => setSelectedSlug(item.slug)}
                    />
                  ))}
                </View>
                {selectedAppliance ? (
                  <View style={styles.selection} accessibilityLiveRegion="polite">
                    <Text style={styles.selectionTitle}>{selectedAppliance.titleAr}</Text>
                    <Text style={styles.body}>
                      {selectedAppliance.availableTechnicians > 0
                        ? `${selectedAppliance.availableTechnicians} فني في دليل هذا الجهاز`
                        : 'لا يوجد فنيون مدرجون لهذا الجهاز حالياً. يمكنك البدء بدليل الأعطال.'}
                    </Text>
                    <SceneAction variant="secondary" label="استكشف دليل الأعطال" onPress={() => navigate('maintenance')} />
                  </View>
                ) : <Text style={styles.body}>لا توجد أجهزة متاحة للاستكشاف حالياً.</Text>}
              </SceneSection>
              <SceneSection title={t('home.quickServices')} eyebrow="كيف نساعدك؟">
                <View style={styles.services}>
                  {data.quickServices.map((item) => (
                    <SceneAction key={item.id} label={item.titleAr} variant="secondary" onPress={() => navigate(item.route)} />
                  ))}
                </View>
              </SceneSection>
              <SceneSection
                title={t('home.currentOrders')}
                eyebrow="مساحة العناية بمنزلك"
                asset={data.currentOrders.length > 0 ? 'tracking_in_progress' : 'customer_home_hero'}
                action={<SceneAction label="عرض الطلبات" variant="secondary" onPress={() => navigate('requests')} />}
              >
                {data.currentOrders.length > 0 ? data.currentOrders.map((order) => (
                  <CurrentOrderCard key={order.id} order={order} />
                )) : (
                  <View style={styles.empty}>
                    <Text style={styles.selectionTitle}>لا طلبات حالياً</Text>
                    <Text style={styles.body}>ستجد هنا حالة طلبات الصيانة ومتابعتها بعد إنشاء طلبك.</Text>
                  </View>
                )}
              </SceneSection>
              <SceneSection
                title={t('home.recommendedTechnicians')}
                eyebrow="اكتشف الخيارات"
                action={<SceneAction label="استكشف الفنيين" onPress={() => navigate('find-technician')} />}
              >
                {data.recommendedTechnicians.length > 0 ? data.recommendedTechnicians.map((technician) => (
                  <View key={technician.id} style={styles.recommendation}>
                    <View style={styles.identity}>
                      <Avatar initials={technician.initialsAr} size={52} background={color.brand.navy} foreground={color.surface.base} />
                      <View style={styles.identityCopy}>
                        <Text style={styles.selectionTitle}>{technician.nameAr}</Text>
                        {technician.specialtyAr ? <Text style={styles.body}>{technician.specialtyAr}</Text> : null}
                        {technician.reviewCount > 0 ? <RatingStars rating={technician.rating} reviewCount={technician.reviewCount} size="sm" /> : null}
                      </View>
                    </View>
                    <SceneAction
                      variant="secondary"
                      label="عرض الملف الشخصي"
                      accessibilityLabel={`عرض ملف ${technician.nameAr}`}
                      onPress={() => router.push({ pathname: '/(customer)/technician/[id]', params: { id: technician.id } })}
                    />
                  </View>
                )) : (
                  <View style={styles.empty}>
                    <Text style={styles.selectionTitle}>لا يوجد فنيون مقترحون في الوقت الحالي</Text>
                    <Text style={styles.body}>يمكنك استكشاف دليل الفنيين أو العودة لاحقاً للاطلاع على الترشيحات.</Text>
                  </View>
                )}
              </SceneSection>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle, direction: 'rtl' },
  navigation: { backgroundColor: color.brand.navy },
  content: { paddingBottom: spacing[6] },
  editorial: { paddingHorizontal: spacing[5], paddingTop: spacing[5] },
  objects: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  selection: { padding: spacing[4], borderRadius: radius.lg, backgroundColor: color.brand.goldSoft, gap: spacing[3] },
  selectionTitle: { color: color.brand.navy, fontSize: typography.size.h3, fontWeight: typography.weight.bold, textAlign: 'right', writingDirection: 'rtl', lineHeight: 30 },
  body: { color: color.text.secondary, fontSize: typography.size.body, lineHeight: 27, textAlign: 'right', writingDirection: 'rtl' },
  services: { gap: spacing[2] },
  empty: { gap: spacing[2] },
  recommendation: { gap: spacing[3], paddingBottom: spacing[4], borderBottomWidth: 1, borderBottomColor: color.border.default },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  identityCopy: { flex: 1, gap: spacing[1] },
});
