/**
 * Technician reviews domain (T-E) — presentation of received ratings.
 *
 * Summary (rating + count) + individual reviews + empty state.
 * No reputation scores, no percentages, no ranking — the product
 * defines none of those. Same rating semantics as the customer side.
 */

export interface TechnicianReviewItem {
  readonly id: string;
  readonly authorAr: string;
  readonly rating: number;
  readonly textAr: string;
  readonly dateAr: string;
}

export interface TechnicianReviewsSummary {
  readonly rating: number;
  readonly reviewCount: number;
  readonly reviews: ReadonlyArray<TechnicianReviewItem>;
}

export interface TechnicianReviewsDataSource {
  getReviews(input: { role: 'technician' }): Promise<TechnicianReviewsSummary>;
}

export class MockTechnicianReviewsDataSource implements TechnicianReviewsDataSource {
  constructor(
    private readonly seed: 'with_reviews' | 'no_reviews' | 'failing' = 'with_reviews',
  ) {}

  async getReviews(_input: { role: 'technician' }): Promise<TechnicianReviewsSummary> {
    if (this.seed === 'failing') {
      throw new Error('تعذر تحميل التقييمات');
    }
    if (this.seed === 'no_reviews') {
      return { rating: 0, reviewCount: 0, reviews: [] };
    }
    return {
      rating: 4.9,
      reviewCount: 213,
      reviews: [
        {
          id: 'tr-1', authorAr: 'أبو تركي', rating: 5,
          textAr: 'ممتاز، حل مشكلة التبريد من أول زيارة.', dateAr: 'قبل ٣ أيام',
        },
        {
          id: 'tr-2', authorAr: 'نورة', rating: 5,
          textAr: 'محترم ودقيق في المواعيد.', dateAr: 'قبل أسبوعين',
        },
        {
          id: 'tr-3', authorAr: 'أم سارة', rating: 4.5,
          textAr: 'شرح واضح للمشكلة قبل الإصلاح.', dateAr: 'قبل شهر',
        },
      ],
    };
  }
}
