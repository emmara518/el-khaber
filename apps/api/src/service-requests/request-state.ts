/**
 * Server-authoritative Service Request transition policy (Task 10F §4).
 *
 * Canonical chain (docs/07_API.md §22):
 *   pending → accepted → on_the_way → in_progress → completed
 *   pending/accepted → cancelled
 *
 * Route mapping (documented route set → state chain):
 *   accept   : pending → accepted
 *   reject   : pending → cancelled | accepted → cancelled   (technician)
 *   cancel   : pending → cancelled | accepted → cancelled   (customer owner)
 *   start    : accepted → on_the_way | on_the_way → in_progress
 *              (the two "activation" steps of the documented chain — the
 *              documented route set has no separate on_the_way route;
 *              ratified in the Task 10F report)
 *   complete : in_progress → completed
 *
 * The client NEVER supplies the next status. Every mutation is guarded by
 * the expected current status inside the same atomic write (§21).
 */

import type { ServiceRequestStatusValue } from '@khabir/shared-validation';

export type TransitionAction = 'accept' | 'reject' | 'start' | 'complete' | 'cancel';

export interface TransitionRule {
  from: ServiceRequestStatusValue;
  to: ServiceRequestStatusValue;
  /** Request timestamp column stamped by this transition, if any. */
  stamp?: 'acceptedAt' | 'startedAt' | 'completedAt' | 'cancelledAt';
}

export const TECHNICIAN_TRANSITIONS: Record<TransitionAction, TransitionRule[]> = {
  accept: [{ from: 'pending', to: 'accepted', stamp: 'acceptedAt' }],
  reject: [
    { from: 'pending', to: 'cancelled', stamp: 'cancelledAt' },
    { from: 'accepted', to: 'cancelled', stamp: 'cancelledAt' },
  ],
  start: [
    { from: 'accepted', to: 'on_the_way', stamp: 'startedAt' },
    { from: 'on_the_way', to: 'in_progress' },
  ],
  complete: [{ from: 'in_progress', to: 'completed', stamp: 'completedAt' }],
  cancel: [],
};

export const CUSTOMER_TRANSITIONS: Record<TransitionAction, TransitionRule[]> = {
  accept: [],
  reject: [],
  start: [],
  complete: [],
  cancel: [
    { from: 'pending', to: 'cancelled', stamp: 'cancelledAt' },
    { from: 'accepted', to: 'cancelled', stamp: 'cancelledAt' },
  ],
};

export function rulesFor(
  actor: 'customer' | 'technician' | 'merchant',
  action: TransitionAction,
): TransitionRule[] {
  if (actor === 'technician') {
    return TECHNICIAN_TRANSITIONS[action];
  }
  if (actor === 'customer') {
    return CUSTOMER_TRANSITIONS[action];
  }
  return [];
}
