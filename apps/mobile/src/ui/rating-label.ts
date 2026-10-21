/**
 * Pure spoken label for a rating, so the whole row announces as one coherent
 * unit instead of a disconnected star + number + count. Unit-tested.
 */
export function ratingSpokenLabel(rating: number, reviewCount: number, showCount = true): string {
  const base = `التقييم ${rating.toFixed(1)} من 5`;
  return showCount ? `${base}، ${reviewCount} مراجعة` : base;
}
