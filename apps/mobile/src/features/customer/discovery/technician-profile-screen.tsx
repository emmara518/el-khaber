/**
 * Technician Profile screen (Batch C) — trust-first.
 *
 * Header (avatar, name, verification, rating, experience) →
 * availability → about → specialties/services → service area →
 * reviews → sticky "اطلب خدمة" handoff CTA (Batch D owns the
 * destination; this screen only builds the typed params).
 * Context (appliance/symptom) survives via route params.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
import { Avatar, Card, RatingStars, SectionHeader } from '@/ui';


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
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {status === 'error' ? (
        <ListError
          title={t('discovery.error.title')}
          message={error?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={retry}
        />
      ) : null}
      {status === 'loaded' ? (
        technician === null ? (
          <>
            <ListEmpty
              icon="👤"
              iconLabel="فني غير موجود"
              title={t('discovery.profile.missing')}
              body={t('discovery.profile.missingBody')}
              actionLabel={t('fault.back')}
              onAction={safeBack}
            />
          </>
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
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function ProfileBody({
  technician,
  onRequestService,
  onBack,
}: {
  technician: Technician;
  onRequestService: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <Card background={color.brand.navy} borderColor={color.brand.navy} padded style={styles.hero}>
        <Avatar
          initials={technician.initialsAr}
          size={84}
          background={color.brand.gold}
          foreground={color.brand.navy}
          statusDot
          statusColor={technician.available ? color.success.DEFAULT : color.text.secondary}
          accessibilityLabel={`${technician.nameAr}${technician.available ? '، متاح' : '، مشغول حاليًا'}`}
        />
        <Text accessibilityRole="header" style={styles.name}>
          {technician.nameAr}
        </Text>
        <Text style={styles.specialty}>{technician.specialtiesAr.join(' · ')}</Text>
        <RatingStars rating={technician.rating} reviewCount={technician.reviewCount} />
        <View style={styles.heroRow}>
          <VerificationBadge verified={technician.verified} />
        </View>
        <Text style={styles.heroMeta}>
          {technician.experienceAr} · {technician.availabilityLabelAr}
        </Text>
      </Card>

      <SectionHeader titleKey="discovery.profile.about" />
      <Card background={color.surface.base} padded>
        <Text style={styles.body}>{technician.aboutAr}</Text>
      </Card>

      <SectionHeader titleKey="discovery.profile.services" />
      <View style={styles.tags}>
        {technician.servicesAr.map((service) => (
          <View key={service} accessibilityLabel={`خدمة: ${service}`} style={styles.tag}>
            <Text style={styles.tagText}>{service}</Text>
          </View>
        ))}
      </View>

      <SectionHeader titleKey="discovery.profile.areas" />
      <Card background={color.surface.base} padded>
        <Text style={styles.body}>📍 {technician.areasAr.join('، ')}</Text>
      </Card>

      <SectionHeader titleKey="discovery.profile.reviews" />
      {technician.reviews.length === 0 ? (
        <Card background={color.surface.base} padded>
          <Text style={styles.body}>{t('discovery.profile.noReviews')}</Text>
        </Card>
      ) : (
        <View style={styles.reviews}>
          {technician.reviews.map((review) => (
            <Card key={review.id} background={color.surface.base} padded>
              <View style={styles.reviewTop}>
                <Text style={styles.reviewAuthor}>{review.authorAr}</Text>
                <Text style={styles.reviewDate}>{review.dateAr}</Text>
              </View>
              <RatingStars rating={review.rating} reviewCount={0} size="sm" showCount={false} />
              <Text style={styles.body}>{review.textAr}</Text>
            </Card>
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`اطلب خدمة من ${technician.nameAr}`}
        onPress={onRequestService}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaText}>{t('discovery.profile.requestService')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('fault.back')}
        onPress={onBack}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>{t('fault.back')}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  hero: {
    alignItems: 'center',
    gap: spacing[2],
  },
  name: {
    color: color.surface.base,
    fontSize: typography.size.h1,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  specialty: {
    color: color.brand.goldSoft,
    fontSize: typography.size.body,
    textAlign: 'center',
  },
  heroRow: {
    flexDirection: 'row',
    marginTop: spacing[1],
  },
  heroMeta: {
    color: color.surface.base,
    fontSize: typography.size.body,
    opacity: 0.9,
    textAlign: 'center',
  },
  body: {
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  tag: {
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  tagText: {
    color: color.text.primary,
    fontSize: typography.size.body,
  },
  reviews: {
    gap: spacing[3],
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewAuthor: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  reviewDate: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
  },
  cta: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[5],
  },
  pressed: {
    opacity: 0.85,
  },
  ctaText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  secondary: {
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
  },
  secondaryText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
