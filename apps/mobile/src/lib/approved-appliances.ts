/**
 * Approved MVP appliance scope (single source of truth for the CLIENT).
 *
 * The product's approved MVP scope is exactly three appliance categories:
 * washing machines, refrigerators and air conditioners. The backend catalog
 * may carry more categories (future work), but the client must only expose
 * the approved set in selection surfaces so the product reads intentionally.
 *
 * This is a presentation-scope guard, not a backend change: categories the
 * backend returns that are outside this scope are simply not offered to the
 * user. Their future assets remain in the repository untouched.
 *
 * Ordered as approved: غسالات, ثلاجات, تكييفات.
 */

export const APPROVED_APPLIANCE_SLUGS = [
  'washing_machine',
  'refrigerator',
  'air_conditioner',
] as const;

export type ApprovedApplianceSlug = (typeof APPROVED_APPLIANCE_SLUGS)[number];

const APPROVED_SET: ReadonlySet<string> = new Set(APPROVED_APPLIANCE_SLUGS);

/** True when a backend/catalog slug is inside the approved MVP scope. */
export function isApprovedApplianceSlug(slug: string | null | undefined): slug is ApprovedApplianceSlug {
  return slug !== null && slug !== undefined && APPROVED_SET.has(slug);
}

/**
 * Stable filter that preserves APPROVED order regardless of backend order,
 * and drops anything outside the approved scope.
 */
export function filterApprovedAppliances<T extends { slug: string }>(items: readonly T[]): T[] {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const ordered: T[] = [];
  for (const slug of APPROVED_APPLIANCE_SLUGS) {
    const match = bySlug.get(slug);
    if (match !== undefined) ordered.push(match);
  }
  return ordered;
}
