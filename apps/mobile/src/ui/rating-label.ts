import { formatArDecimal, formatArNumber } from '@/lib/api-format';

/**
 * Pure spoken label for a rating, so the whole row announces as one coherent
 * unit instead of a disconnected star + number + count. Unit-tested.
 */
export function ratingSpokenLabel(rating: number, reviewCount: number, showCount = true): string {
  const base = `التقييم ${formatArDecimal(rating, 1)} من ${formatArNumber(5)}`;
  return showCount ? `${base}، ${formatArNumber(reviewCount)} مراجعة` : base;
}
