/**
 * Technician request domain (T-C).
 *
 * Canonical lifecycle enum reused from the customer requests module
 * (`CustomerRequestStatus` — pending/accepted/on_the_way/in_progress/
 * completed/cancelled per docs/07_API.md §22). Arabic labels map the
 * enum in UI only; the enum itself is never renamed.
 * Shared identity with the T-A home preview (tin-001/tin-002).
 */

import type { CustomerRequestStatus } from '../../customer/requests/customer-requests-types';

export type { CustomerRequestStatus };

export interface TechnicianRequest {
  readonly id: string;
  readonly customerNameAr: string;
  readonly applianceAr: string;
  readonly problemAr: string;
  readonly descriptionAr: string;
  readonly locationAr: string;
  readonly timeAr: string;
  readonly createdAr: string;
  readonly appointmentAr: string | null;
  readonly status: CustomerRequestStatus;
  readonly statusLabelAr: string;
}

export type TechnicianRequestFilter = 'all' | CustomerRequestStatus;

export const TECHNICIAN_REQUEST_FILTERS: ReadonlyArray<{
  id: TechnicianRequestFilter;
  labelAr: string;
}> = [
  { id: 'all', labelAr: 'الكل' },
  { id: 'pending', labelAr: 'جديد' },
  { id: 'accepted', labelAr: 'مقبول' },
  { id: 'on_the_way', labelAr: 'في الطريق' },
  { id: 'in_progress', labelAr: 'قيد التنفيذ' },
  { id: 'completed', labelAr: 'مكتمل' },
  { id: 'cancelled', labelAr: 'ملغي' },
];

export const TECHNICIAN_STATUS_LABELS: Record<CustomerRequestStatus, string> = {
  pending: 'قيد الانتظار',
  accepted: 'مقبول',
  on_the_way: 'في الطريق',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

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
