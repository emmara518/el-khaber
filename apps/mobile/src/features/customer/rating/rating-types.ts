/**
 * Rating contracts + pure selection helpers.
 *
 * 1–5 stars (required), tags + comment optional. Review tags are canonical
 * server data (WP-2C): the client fetches them from `GET /review-tags` and
 * submits `tag_ids` (UUIDs). No hardcoded tag taxonomy exists here.
 */

import type { ReviewTagDto } from '@khabir/shared-types';

/** Canonical review tag as returned by `GET /review-tags`. */
export type ReviewTag = ReviewTagDto;

export const RATING_LABELS_AR: Record<number, string> = {
  1: 'سيئ',
  2: 'مقبول',
  3: 'جيد',
  4: 'جيد جدًا',
  5: 'ممتاز',
};

export interface RatingInput {
  readonly requestId: string;
  readonly technicianId: string;
  readonly stars: number;
  /** Canonical tag UUIDs from `GET /review-tags`. */
  readonly tagIds: ReadonlyArray<string>;
  readonly commentAr: string;
}

export interface RatingDataSource {
  /** Canonical active tags (server-owned taxonomy). */
  listTags: () => Promise<ReadonlyArray<ReviewTag>>;
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
