/**
 * Truthful location presentation for the customer profile.
 *
 * The API exposes no customer city/district yet (reported gap), so the
 * location line is built only from real, non-empty parts. When nothing is
 * present the caller renders an explicit "no saved location" copy — never a
 * dangling separator such as " - ".
 */
export function profileLocationLabel(
  cityAr: string | null | undefined,
  districtAr: string | null | undefined,
): string | null {
  const parts = [cityAr, districtAr]
    .map((part) => (part ?? '').trim())
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(' · ') : null;
}
