/**
 * Shared presentation mappings for the service-request lifecycle
 * (Task 10J). The lifecycle enum is server-owned (docs/07_API.md §22);
 * these helpers only provide its Arabic display labels and the
 * privacy-safe identity fallbacks the API deliberately omits.
 */

import type { ServiceRequestStatus } from '@khabir/shared-types';

/** Arabic display label per canonical lifecycle status. */
export const REQUEST_STATUS_LABELS_AR: Readonly<Record<ServiceRequestStatus, string>> = {
  pending: 'قيد الانتظار',
  accepted: 'مقبول',
  on_the_way: 'في الطريق',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

/** Non-terminal statuses (the customer's "active orders"). */
export function isActiveStatus(status: ServiceRequestStatus): boolean {
  return status === 'pending' || status === 'accepted' || status === 'on_the_way' || status === 'in_progress';
}

/**
 * Privacy fallback: the API intentionally exposes no customer
 * identifiers to technicians (docs/07 §6/§7) — the card shows a
 * generic label instead of an invented name.
 */
export const CUSTOMER_NAME_FALLBACK_AR = 'العميل';

/** Fallback when a technician's public profile is absent (404). */
export const TECHNICIAN_NAME_FALLBACK_AR = 'الفني المختص';

/** First Arabic-initial of a display name ('' when empty). */
export function initialsOf(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1) : '';
}
