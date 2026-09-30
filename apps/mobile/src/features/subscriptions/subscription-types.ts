/**
 * Shared subscription types + mappers (Task 10J).
 *
 * Domain vocabulary for the subscription/payment integration surface:
 * - GET /subscription-plans (role-scoped active plans),
 * - GET /subscriptions/current (+ merchant alias),
 * - GET /me/entitlements (+ /me/subscription),
 * - POST /subscriptions/:id/cancel (renewal cancel),
 * - manual payments: GET /payments/config, POST /subscriptions,
 *   GET /payments/submissions (+ merchant payment alias).
 *
 * Source: docs/07_API.md §14–§15, docs/08_SUBSCRIPTIONS.md.
 */

import type { CurrentSubscriptionDto, PaymentSubmissionDto, SubscriptionPlanDto } from '@khabir/shared-types';

export type SubscriptionRole = 'customer' | 'technician' | 'merchant';
export type PaymentMethod = 'instapay' | 'vodafone_cash';

export interface SubscriptionPlan {
  readonly id: string;
  readonly code: string;
  readonly nameAr: string;
  readonly price: number;
  readonly currency: string;
  readonly billingInterval: string;
  readonly role: SubscriptionRole;
}

export interface CurrentSubscription {
  readonly id: string;
  readonly status: CurrentSubscriptionDto['status'];
  readonly statusAr: string;
  readonly planNameAr: string;
  readonly planId: string;
  readonly price: number;
  readonly currency: string;
  readonly billingInterval: string;
  readonly renewalEnabled: boolean;
  readonly currentPeriodEnd: string;
  readonly entitlements: ReadonlyArray<string>;
}

export function subscriptionStatusAr(status: CurrentSubscriptionDto['status']): string {
  switch (status) {
    case 'active':
      return 'نشطة';
    case 'pending':
      return 'بانتظار التفعيل';
    case 'trialing':
      return 'فترة تجريبية';
    case 'past_due':
      return 'متأخرة السداد';
    case 'cancelled':
      return 'ملغاة';
    case 'expired':
      return 'منتهية';
  }
}

export function paymentStatusAr(status: PaymentSubmissionDto['status']): string {
  switch (status) {
    case 'pending':
      return 'قيد المراجعة';
    case 'approved':
      return 'مقبول';
    case 'rejected':
      return 'مرفوض';
  }
}

export type PaymentSubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Duplicate-submission guard: a new payment submission is not allowed while
 * one is in flight, nor after a successful submission (the user may reset
 * deliberately to resubmit). Never permits a divergent optimistic state.
 */
export function canSubmitPayment(status: PaymentSubmitStatus): boolean {
  return status !== 'submitting' && status !== 'success';
}

export function mapPlan(dto: SubscriptionPlanDto): SubscriptionPlan {
  return {
    id: dto.id,
    code: dto.code,
    nameAr: dto.nameAr,
    price: dto.price,
    currency: dto.currency,
    billingInterval: dto.billingInterval,
    role: dto.role,
  };
}

export function mapCurrent(
  dto: CurrentSubscriptionDto | null,
  entitlements: ReadonlyArray<string>,
): CurrentSubscription | null {
  if (dto === null || dto.plan === null) return null;
  return {
    id: dto.id,
    status: dto.status,
    statusAr: subscriptionStatusAr(dto.status),
    planNameAr: dto.plan.nameAr,
    planId: dto.plan.id,
    price: dto.plan.price,
    currency: dto.plan.currency,
    billingInterval: dto.plan.billingInterval,
    renewalEnabled: dto.renewalEnabled,
    currentPeriodEnd: dto.currentPeriodEnd,
    entitlements,
  };
}

/** Only an ACTIVE subscription allows the documented renewal cancel. */
export function canCancelRenewal(current: CurrentSubscription): boolean {
  return current.status === 'active' && current.renewalEnabled;
}

/** A plan is selectable only when it is not the current active plan. */
export function canSelectPlan(plan: SubscriptionPlan, current: CurrentSubscription | null): boolean {
  return current?.status === 'active' ? plan.id !== current.planId : true;
}

/**
 * Descriptive next-action for a plan given the supported (manual) payment
 * flow. `current` = this is the caller's active plan; `available` = it can
 * be requested through the existing manual-payment submission flow. This is
 * presentation copy only — it never promises activation.
 */
export function subscribeNextAction(
  plan: SubscriptionPlan,
  current: CurrentSubscription | null,
): { kind: 'current' | 'available'; labelAr: string } {
  if (current?.status === 'active' && current.planId === plan.id) {
    return {
      kind: 'current' as const,
      labelAr: current.renewalEnabled
        ? 'باقتك الحالية · التجديد مفعّل'
        : 'باقتك الحالية · التجديد موقوف',
    };
  }
  return {
    kind: 'available' as const,
    labelAr: 'متاحة للاشتراك عبر الدفع اليدوي',
  };
}
