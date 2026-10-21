/**
 * Query-string + pagination helpers for API adapters (Task 10J).
 *
 * List endpoints follow docs/07_API.md §19: `page`/`limit` with
 * server-computed `total`/`totalPages`/`hasNext` metadata (server max
 * limit: 100). `drainPages` walks the paginated list up to a bounded
 * page cap so client-side filters/counters operate on the full
 * bounded dataset instead of silently dropping later pages.
 */

import type { ApiMeta } from '@khabir/shared-types';

export type QueryValue = string | number | boolean | undefined | null;

/** Build a `?a=1&b=2` suffix; empty/absent values are skipped. */
export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const raw = String(value);
    if (raw.length === 0) continue;
    search.set(key, raw);
  }
  const qs = search.toString();
  return qs.length > 0 ? `?${qs}` : '';
}

export interface DrainedPage<T> {
  readonly items: readonly T[];
  readonly meta: ApiMeta | undefined;
}

/** Server-enforced maximum limit (docs/07_API.md §19). */
export const PAGE_LIMIT = 100;
/** Bounded drain cap — never walk unbounded pagination. */
export const MAX_DRAIN_PAGES = 5;

/**
 * Fetch every page (bounded) of a paginated list endpoint.
 * Stops when `meta.hasNext` is false or the page cap is reached.
 */
export async function drainPages<T>(
  fetchPage: (page: number, limit: number) => Promise<DrainedPage<T>>,
): Promise<readonly T[]> {
  const first = await fetchPage(1, PAGE_LIMIT);
  const items: T[] = [...first.items];
  let page = 1;
  let hasNext = first.meta?.hasNext ?? false;
  while (hasNext && page < MAX_DRAIN_PAGES) {
    page += 1;
    const next = await fetchPage(page, PAGE_LIMIT);
    items.push(...next.items);
    hasNext = next.meta?.hasNext ?? false;
  }
  return items;
}
