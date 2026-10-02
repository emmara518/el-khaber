/**
 * Shared presentation mapping for the server-owned technician availability
 * enum (`@khabir/shared-types` §TechnicianAvailabilityStatus).
 *
 * Both the technician's own home (self status) and the customer discovery
 * surface read the same server field; this is the single Arabic label source
 * so the two surfaces can never disagree or silently diverge.
 *
 * `busy` is a reserved server state — safe display only, no phase-4 behavior.
 */

import type { TechnicianPublicDto } from '@khabir/shared-types';

/** Canonical server availability union (derived from the shared contract). */
export type TechnicianAvailabilityStatus = TechnicianPublicDto['availabilityStatus'];

/** Arabic display label per canonical availability status. */
export const AVAILABILITY_LABELS_AR: Readonly<Record<TechnicianAvailabilityStatus, string>> = {
  available: 'متاح',
  busy: 'مشغول حاليًا',
  unavailable: 'غير متاح',
};

export function availabilityLabelAr(status: TechnicianAvailabilityStatus): string {
  return AVAILABILITY_LABELS_AR[status];
}

/** Available only when the canonical status is `available` (never colour-only). */
export function isAvailable(status: TechnicianAvailabilityStatus): boolean {
  return status === 'available';
}
