/**
 * Customer Requests — view-model and data-source contracts (Batch A).
 *
 * Order lifecycle follows docs/07_API.md §22 (pending → accepted →
 * on_the_way → in_progress → completed, plus cancelled). Labels are
 * Arabic presentation of that server-owned enum; the UI never invents
 * states outside it.
 */

export type CustomerRequestStatus =
  | 'pending'
  | 'accepted'
  | 'on_the_way'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type RequestsFilter = 'all' | CustomerRequestStatus;

export interface CustomerRequestItem {
  readonly id: string;
  readonly applianceAr: string;
  readonly taskAr: string;
  readonly brandAndModel: string;
  readonly technicianNameAr: string;
  readonly technicianInitialsAr: string;
  readonly status: CustomerRequestStatus;
  readonly statusLabelAr: string;
  readonly scheduledLabelAr: string;
}

export interface CustomerRequestsViewModel {
  readonly requests: ReadonlyArray<CustomerRequestItem>;
}

export interface CustomerRequestsDataSource {
  getRequests(input: { role: 'customer' }): Promise<CustomerRequestsViewModel>;
}

export const REQUEST_FILTERS: ReadonlyArray<{ id: RequestsFilter; labelAr: string }> = [
  { id: 'all', labelAr: 'الكل' },
  { id: 'pending', labelAr: 'قيد الانتظار' },
  { id: 'accepted', labelAr: 'مقبول' },
  { id: 'on_the_way', labelAr: 'في الطريق' },
  { id: 'in_progress', labelAr: 'قيد التنفيذ' },
  { id: 'completed', labelAr: 'مكتمل' },
  { id: 'cancelled', labelAr: 'ملغي' },
];

/** Pure filter helper — unit-tested, reused by the screen. */
export function filterRequestsByStatus(
  requests: ReadonlyArray<CustomerRequestItem>,
  filter: RequestsFilter,
): ReadonlyArray<CustomerRequestItem> {
  if (filter === 'all') return requests;
  return requests.filter((r) => r.status === filter);
}
