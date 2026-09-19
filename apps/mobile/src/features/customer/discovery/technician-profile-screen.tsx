/**
 * Technician Profile screen (Batch C) — trust-first, cohesive narrative.
 *
 * Real identity (avatar, name, verification, rating, availability)
 * stays visually separate from the illustrative scene art. The page
 * reads as one narrative: identity → about → services → reviews →
 * location → request CTA. Context (appliance/symptom) survives via
 * route params; the request handoff destination is unchanged.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListEmpty, ListError, ListLoading } from '../components/list-state-view';
import { useSafeBack } from '../components/use-safe-back';

import { VerificationBadge } from './components/verification-badge';
import {
  buildServiceRequestHandoff,
  findTechnician,
  type Technician,
} from './technician-types';
import { useTechniciansViewModel } from './use-technicians-view-model';

import type { ApplianceSlug } from '../home/data/customer-home-types';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, Icon, RatingStars } from '@/ui';
import { SceneAction, SceneHero, SceneSection } from '@/ui/cinematic';

export default function TechnicianProfileScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; appliance?: string; symptomId?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const appliance =
    params.appliance === 'washing_machine' ||
    params.appliance === 'refrigerator' ||
    params.appliance === 'air_conditioner'
      ? (params.appliance as ApplianceSlug)
      : undefined;
  const symptomId = typeof params.symptomId === 'string' && params.symptomId.length > 0 ? params.symptomId : undefined;

  const { status, data, error, retry } = useTechniciansViewModel();
  const technician = data !== null ? findTechnician(data, id) : null;
  const safeBack = useSafeBack('/(customer)/find-technician');

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {status === 'error' ? (
        <ListError title={t('discovery.error.title')} message={error?.message ?? ''} retryLabel={t('state.retry')} onRetry={retry} />
      ) : null}
      {status === 'loaded' ? (
        technician === null ? (
          <ListEmpty asset="technician_placeholder_female" icon="user" iconLabel="فني غير موجود" title={t('discovery.profile.missing')} body={t('discovery.profile.missingBody')} actionLabel={t('fault.back')} onAction={safeBack} />
        ) : (
          <ProfileBody
            technician={technician}
            onRequestService={() =>
              router.push(buildServiceRequestHandoff({ technicianId: technician.id, applianceSlug: appliance, symptomId }))
            }
            onBack={safeBack}
          />
        )
      ) : null}
    </SafeAreaView>
  );
}

function ProfileBody({ technician, onRequestService, onBack }: { technician: Technician; onRequestService: () => void; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SceneHero
        asset="technician_profile_hero"
        eyebrow={technician.specialtiesAr.join(' · ')}
        title={technician.nameAr}
        body={`${technician.experienceAr} · ${technician.availabilityLabelAr}`}
        action={<SceneAction label={t('discovery.profile.requestService')} accessibilityLabel={`اطلب خدمة من ${technician.nameAr}`} onPress={onRequestService} />}
        compact
      >
        <View style={styles.identity}>
          <Avatar initials={technician.initialsAr} size={72} background={color.brand.gold} foreground={color.brand.navy} statusDot statusColor={technician.available ? color.success.DEFAULT : color.text.secondary} accessibilityLabel={`${technician.nameAr}${technician.available ? '، متاح' : '، مشغول حاليًا'}`} />
          <View style={styles.identityCopy}>
            <VerificationBadge verified={technician.verified} />
            <RatingStars rating={technician.rating} reviewCount={technician.reviewCount} />
          </View>
        </View>
      </SceneHero>
      <View style={styles.editorial}>
        <SceneSection title={t('discovery.profile.about')} eyebrow="نبذة" asset="technician_profile_services">
          <Text style={styles.body}>{technician.aboutAr}</Text>
        </SceneSection>
        <SceneSection title={t('discovery.profile.services')} eyebrow="ما يمكنه تقديمه" body="الخدمات مدرجة كما يقدمها الفني." action={<SceneAction label="اطلب خدمة" onPress={onRequestService} />}>
          <View style={styles.services}>
            {technician.servicesAr.map((service) => (
              <View key={service} style={styles.serviceTag} accessibilityLabel={`خدمة: ${service}`}>
                <Text style={styles.serviceText}>{service}</Text>
              </View>
            ))}
          </View>
        </SceneSection>
        <SceneSection title={t('discovery.profile.reviews')} eyebrow="تجارب حقيقية" asset="technician_profile_reviews">
          {technician.reviews.length === 0 ? (
            <Text style={styles.body}>{t('discovery.profile.noReviews')}</Text>
          ) : (
            <View style={styles.reviews}>
              {technician.reviews.map((review) => (
                <View key={review.id} style={styles.review}>
                  <View style={styles.reviewTop}>
                    <Text style={styles.reviewAuthor}>{review.authorAr}</Text>
                    <Text style={styles.reviewDate}>{review.dateAr}</Text>
                  </View>
                  <RatingStars rating={review.rating} reviewCount={0} size="sm" showCount={false} />
                  <Text style={styles.body}>{review.textAr}</Text>
                </View>
              ))}
            </View>
          )}
        </SceneSection>
        <SceneSection title={t('discovery.profile.areas')} eyebrow="أين يعمل" asset="technician_profile_location">
          <View style={styles.areaRow}>
            <Icon name="map-pin" size={16} color={color.text.secondary} accessibilityLabel="مناطق الخدمة" />
            <Text style={styles.body}>{technician.areasAr.join('، ')}</Text>
          </View>
        </SceneSection>
        <SceneSection title="تعامل بثقة" eyebrow="الشفافية أولاً" asset="technician_trust" body="بيانات الملف والتقييمات من سجل المنصة كما هي. راجع التخصص ومناطق الخدمة وتقييمات العملاء قبل تأكيد الطلب." />
        <View style={styles.ctaFooter}>
          <SceneAction label={t('discovery.profile.requestService')} accessibilityLabel={`اطلب خدمة من ${technician.nameAr}`} onPress={onRequestService} />
          <SceneAction label={t('fault.back')} variant="secondary" onPress={onBack} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.brand.navy, direction: 'rtl' },
  content: { flexGrow: 1, backgroundColor: color.surface.subtle, paddingBottom: spacing[8] },
  editorial: { paddingHorizontal: spacing[5], paddingTop: spacing[4] },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[2] },
  identityCopy: { gap: spacing[2] },
  body: { color: color.text.primary, fontSize: typography.size.body, textAlign: 'right', writingDirection: 'rtl', lineHeight: 28 },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  serviceTag: { backgroundColor: color.brand.goldSoft, borderRadius: radius.pill, paddingHorizontal: spacing[4], paddingVertical: spacing[2], minHeight: 44, justifyContent: 'center' },
  serviceText: { color: color.brand.navy, fontSize: typography.size.body, fontWeight: typography.weight.semibold, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' },
  reviews: { gap: spacing[3] },
  review: { borderWidth: 1, borderColor: color.border.default, borderRadius: radius.lg, backgroundColor: color.surface.base, padding: spacing[4], gap: spacing[2] },
  reviewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewAuthor: { color: color.text.primary, fontSize: typography.size.body, fontWeight: typography.weight.bold, lineHeight: 26, textAlign: 'right', writingDirection: 'rtl' },
  reviewDate: { color: color.text.secondary, fontSize: typography.size.caption, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  ctaFooter: { gap: spacing[3], marginTop: spacing[5] },
});
