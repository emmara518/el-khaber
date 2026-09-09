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

/**
 * Service progression (T-D): the documented forward chain
 * accepted → on_the_way → in_progress → completed (docs/07_API.md
 * §22). One deliberate "advance" action per state; terminal states
 * and pending cannot advance.
 */
export function nextServiceStatus(status: CustomerRequestStatus): {
  ok: true;
  next: Exclude<CustomerRequestStatus, 'pending' | 'cancelled'>;
} | { ok: false; reason: 'terminal' | 'invalid_transition' } {
  switch (status) {
    case 'accepted':
      return { ok: true, next: 'on_the_way' };
    case 'on_the_way':
      return { ok: true, next: 'in_progress' };
    case 'in_progress':
      return { ok: true, next: 'completed' };
    case 'completed':
    case 'cancelled':
      return { ok: false, reason: 'terminal' };
    case 'pending':
      return { ok: false, reason: 'invalid_transition' };
  }
}

/** Action copy per progression step (docs/04_UI_UX.md §20 language). */
export function advanceActionLabelAr(status: CustomerRequestStatus): string | null {
  switch (status) {
    case 'accepted':
      return 'أنا في الطريق';
    case 'on_the_way':
      return 'بدء العمل على الطلب';
    case 'in_progress':
      return 'إنهاء الخدمة';
    default:
      return null;
  }
}
