/**
 * Technician request domain (T-C).
 *
 * Canonical lifecycle enum is the server-owned `ServiceRequestStatus`
 * from `@khabir/shared-types` (pending/accepted/on_the_way/in_progress/
 * completed/cancelled per docs/07_API.md §22). Arabic labels come from
 * the single shared `REQUEST_STATUS_LABELS_AR` map — the Technician
 * surface no longer imports from the Customer feature tree.
 */

import { REQUEST_STATUS_LABELS_AR } from '../../../lib/request-labels';

import type { ServiceRequestStatus } from '@khabir/shared-types';

export type { ServiceRequestStatus };
export type CustomerRequestStatus = ServiceRequestStatus;

export interface TechnicianRequest {
  readonly id: string;
  readonly customerNameAr: string;
  readonly applianceAr: string;
  /** Canonical category slug — drives the approved appliance asset. */
  readonly applianceSlug: string | null;
  readonly problemAr: string;
  readonly descriptionAr: string;
  readonly locationAr: string;
  readonly timeAr: string;
  readonly createdAr: string;
  readonly appointmentAr: string | null;
  readonly status: ServiceRequestStatus;
  readonly statusLabelAr: string;
}

export type TechnicianRequestFilter = 'all' | ServiceRequestStatus;

/**
 * Filter chips. Only `all` and the shorter `pending` label are
 * Technician-specific; every other label is derived from the single
 * shared lifecycle map so terminology can never drift between the
 * filter bar and the status badges.
 */
export const TECHNICIAN_REQUEST_FILTERS: ReadonlyArray<{
  id: TechnicianRequestFilter;
  labelAr: string;
}> = [
  { id: 'all', labelAr: 'الكل' },
  { id: 'pending', labelAr: 'جديد' },
  { id: 'accepted', labelAr: REQUEST_STATUS_LABELS_AR.accepted },
  { id: 'on_the_way', labelAr: REQUEST_STATUS_LABELS_AR.on_the_way },
  { id: 'in_progress', labelAr: REQUEST_STATUS_LABELS_AR.in_progress },
  { id: 'completed', labelAr: REQUEST_STATUS_LABELS_AR.completed },
  { id: 'cancelled', labelAr: REQUEST_STATUS_LABELS_AR.cancelled },
];

/** Backward-compatible alias of the shared lifecycle label map. */
export const TECHNICIAN_STATUS_LABELS: Readonly<Record<ServiceRequestStatus, string>> =
  REQUEST_STATUS_LABELS_AR;

/** Pure filter helper (unit-tested). */
export function filterTechnicianRequests(
  requests: ReadonlyArray<TechnicianRequest>,
  filter: TechnicianRequestFilter,
): ReadonlyArray<TechnicianRequest> {
  if (filter === 'all') return requests;
  return requests.filter((r) => r.status === filter);
}

export function findTechnicianRequest(
  requests: ReadonlyArray<TechnicianRequest>,
  id: string,
): TechnicianRequest | null {
  return requests.find((r) => r.id === id) ?? null;
}

/** Canonical forward chain (excludes the terminal cancellation branch). */
export const TECHNICIAN_LIFECYCLE: ReadonlyArray<Exclude<ServiceRequestStatus, 'cancelled'>> = [
  'pending',
  'accepted',
  'on_the_way',
  'in_progress',
  'completed',
];

export type TechnicianStepState = 'done' | 'current' | 'upcoming';

export interface TechnicianTimelineStep {
  readonly status: Exclude<ServiceRequestStatus, 'cancelled'>;
  readonly state: TechnicianStepState;
}

/**
 * Build the technician lifecycle timeline for a status. Steps before the
 * current index are done, the matching step current, later steps
 * upcoming. Cancelled shows every reached step as done; completed shows
 * every step done. Pure — mirrors the server's documented chain.
 */
export function buildTechnicianTimeline(status: ServiceRequestStatus): ReadonlyArray<TechnicianTimelineStep> {
  if (status === 'cancelled') {
    return TECHNICIAN_LIFECYCLE.map((s) => ({ status: s, state: 'upcoming' as const }));
  }
  if (status === 'completed') {
    return TECHNICIAN_LIFECYCLE.map((s) => ({ status: s, state: 'done' as const }));
  }
  const currentIndex = TECHNICIAN_LIFECYCLE.findIndex((s) => s === status);
  return TECHNICIAN_LIFECYCLE.map((s, index) => ({
    status: s,
    state: (index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming') as TechnicianStepState,
  }));
}
