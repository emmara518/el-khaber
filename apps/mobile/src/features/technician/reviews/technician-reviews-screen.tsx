/**
 * Technician Reviews screen (T-E) — Customer visual language.
 *
 * AppHeader → PageTitle → rating summary card → review cards +
 * empty/error/loading. No cinematic header.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTechnicianReviewsViewModel } from './use-technician-reviews-view-model';

import type { TechnicianReviewsDataSource } from './technician-reviews-types';

import { useI18n } from '@/i18n/use-i18n';
import {
  AppHeader,
  Card,
  ListEmpty,
  ListError,
  ListLoading,
  PageTitle,
  RatingStars,
} from '@/ui';
import { fontFamily, type } from '@/ui/typography';

export default function TechnicianReviewsScreen({
  source,
}: {
  source?: TechnicianReviewsDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useTechnicianReviewsViewModel(source);

  return (
    <View style={styles.root}>
      <AppHeader
        onPressNotifications={() => router.push('/(technician)/notifications')}
        onPressAvatar={() => router.push('/(technician)/profile')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageTitle eyebrow="سمعتك المهنية" title={t('tech.reviews.title')} body={t('tech.reviews.subtitle')} />

        {status === 'loading' ? <ListLoading label={t('state.loading')} brandAsset="toolbox" /> : null}
        {status === 'error' ? (
          <ListError
            title={t('tech.reviews.error')}
            message={error?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={retry}
          />
        ) : null}
        {status === 'loaded' && data ? (
          <>
            <Card background={color.brand.navy} borderColor={color.brand.navy} padded style={styles.summary}>
              <RatingStars rating={data.rating} reviewCount={data.reviewCount} />
              <Text style={styles.summaryText}>
                {data.reviewCount} {t('tech.reviews.count')}
              </Text>
            </Card>

            {data.reviews.length === 0 ? (
              <ListEmpty
                brandAsset="no-requests"
                icon="star"
                iconLabel="لا توجد تقييمات"
                title={t('tech.reviews.empty')}
                body={t('tech.reviews.emptyBody')}
              />
            ) : (
              <View style={styles.list}>
                {data.reviews.map((review) => (
                  <Card key={review.id} background={color.surface.base} padded style={styles.review}>
                    <View style={styles.reviewTop}>
                      <Text style={styles.reviewAuthor}>{review.authorAr}</Text>
                      <Text style={styles.reviewDate}>{review.dateAr}</Text>
                    </View>
                    <RatingStars rating={review.rating} reviewCount={0} size="sm" showCount={false} />
                    <Text style={styles.reviewText}>{review.textAr}</Text>
                  </Card>
                ))}
              </View>
            )}
          </>
        ) : null}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  summary: { alignItems: 'center', gap: spacing[2] },
  summaryText: { ...type.body, color: color.brand.goldSoft },
  list: { gap: spacing[3] },
  review: { gap: spacing[1] },
  reviewTop: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', justifyContent: 'space-between' },
  reviewAuthor: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', fontFamily: fontFamily.bold },
  reviewDate: { ...type.caption, color: color.text.secondary },
  reviewText: { ...type.body, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  bottomSpacer: { height: spacing[2] },
});
