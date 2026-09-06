/**
 * Rating contracts + pure selection helpers (Batch E).
 *
 * 1–5 stars (required), tags + comment optional. No scores, no
 * ranking, no percentages — a plain customer review.
 */

export const RATING_LABELS_AR: Record<number, string> = {
  1: 'سيئ',
  2: 'مقبول',
  3: 'جيد',
  4: 'جيد جدًا',
  5: 'ممتاز',
};

export const RATING_TAGS_AR: ReadonlyArray<string> = [
  'احترافية',
  'التزام بالموعد',
  'نظافة العمل',
  'شرح واضح',
  'سعر عادل',
];

export interface RatingInput {
  readonly requestId: string;
  readonly technicianId: string;
  readonly stars: number;
  readonly tags: ReadonlyArray<string>;
  readonly commentAr: string;
}

export interface RatingDataSource {
  submitRating(input: RatingInput): Promise<{ ok: true }>;
}

/** Selection validation — Arabic message or null. */
export function validateRating(stars: number | null): string | null {
  if (stars === null || stars < 1 || stars > 5) return 'اختر عدد النجوم أولًا (من ١ إلى ٥)';
  return null;
}

export function toggleTag(tags: ReadonlyArray<string>, tag: string): ReadonlyArray<string> {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
}
