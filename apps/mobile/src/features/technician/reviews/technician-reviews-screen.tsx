/**
 * Technician Reviews screen (T-E) — received ratings presentation.
 * Overall summary (RatingStars + count) + individual review cards
 * + honest empty state + error/retry. No scores, no ranking.
 */

import { color, spacing, typography } from '@khabir/ui-tokens';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListEmpty, ListError, ListLoading } from '../../customer/components/list-state-view';

import { useTechnicianReviewsViewModel } from './use-technician-reviews-view-model';

import type { TechnicianReviewsDataSource } from './technician-reviews-types';

import { useI18n } from '@/i18n/use-i18n';
import { Card, RatingStars, SectionHeader } from '@/ui';


export default function TechnicianReviewsScreen({
  source,
}: {
  source?: TechnicianReviewsDataSource;
}) {
  const { t } = useI18n();
  const { status, data, error, retry } = useTechnicianReviewsViewModel(source);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('tech.reviews.title')}
      </Text>
      <Text style={styles.subtitle}>{t('tech.reviews.subtitle')}</Text>

      {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
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

          <SectionHeader titleKey="tech.reviews.list" />
          {data.reviews.length === 0 ? (
            <ListEmpty
              icon="⭐"
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
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  summary: {
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  summaryText: {
    color: color.brand.goldSoft,
    fontSize: typography.size.body,
  },
  list: {
    gap: spacing[3],
  },
  review: {
    gap: spacing[1],
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
  reviewText: {
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
