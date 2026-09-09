/**
 * Request action policy — pure transition layer (unit-tested).
 *
 * Derived from docs/07_API.md §22 (state transition rules):
 *   pending → accepted        (accept ✅)
 *   pending → cancelled       (reject ✅)
 *   accepted → cancelled      (reject ✅, policy permits)
 *   accepted → on_the_way     (T-D scope, not an action here)
 * Everything else (accept or reject from on_the_way / in_progress /
 * completed / cancelled, accept from accepted) is rejected.
 */

import type { CustomerRequestStatus } from '../../customer/requests/customer-requests-types';

export type TechnicianRequestAction = 'accept' | 'reject';

export type PolicyRejection = 'invalid_transition' | 'terminal';

export type PolicyDecision =
  | { readonly ok: true; readonly next: CustomerRequestStatus }
  | { readonly ok: false; readonly reason: PolicyRejection };

const TERMINAL: ReadonlyArray<CustomerRequestStatus> = ['completed', 'cancelled'];

export function decideRequestAction(
  status: CustomerRequestStatus,
  action: TechnicianRequestAction,
): PolicyDecision {
  if (action === 'accept') {
    if (status === 'pending') return { ok: true, next: 'accepted' };
    return { ok: false, reason: TERMINAL.includes(status) ? 'terminal' : 'invalid_transition' };
  }
  if (status === 'pending' || status === 'accepted') {
    return { ok: true, next: 'cancelled' };
  }
  return { ok: false, reason: TERMINAL.includes(status) ? 'terminal' : 'invalid_transition' };
}

export function canAccept(status: CustomerRequestStatus): boolean {
  return decideRequestAction(status, 'accept').ok;
}

export function canReject(status: CustomerRequestStatus): boolean {
  return decideRequestAction(status, 'reject').ok;
}

/** User-safe Arabic for policy + concurrency failures. */
export function requestActionErrorAr(code: 'stale' | 'invalid_transition' | 'terminal' | 'unknown'): string {
  switch (code) {
    case 'stale':
      return 'لم يعد هذا الطلب متاحًا بهذا الإجراء. قد تم تحديثه من مكان آخر.';
    case 'invalid_transition':
      return 'تعذر تنفيذ هذا الإجراء على الحالة الحالية للطلب.';
    case 'terminal':
      return 'هذا الطلب مغلق ولا يقبل إجراءات جديدة.';
    case 'unknown':
      return 'تعذر تحديث الطلب. حاول مرة أخرى.';
  }
}
