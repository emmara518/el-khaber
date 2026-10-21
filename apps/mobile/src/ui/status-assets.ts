/**
 * Maps the canonical service-request lifecycle to the approved brand
 * status emblems. Presentation only — the lifecycle enum is server-owned
 * (docs/07_API.md §22); this never invents or reorders statuses.
 */

import type { BrandAssetName } from './brand-assets';

const STATUS_BRAND: Record<string, BrandAssetName> = {
  pending: 'pending',
  accepted: 'accepted',
  on_the_way: 'on-the-way',
  in_progress: 'in-progress',
  completed: 'completed',
  cancelled: 'cancelled',
  scheduled: 'scheduled',
};

/** Approved emblem for a lifecycle status, or `undefined` when unknown. */
export function statusBrandAsset(status: string): BrandAssetName | undefined {
  return STATUS_BRAND[status];
}
