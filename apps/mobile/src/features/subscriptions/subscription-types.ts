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
 * Honest next action for a plan given the supported endpoints (07 §14):
 * purchase/payment flows are NOT implemented, so selection always
 * resolves to reading semantics, never to a payment promise.
 */
export function subscribeNextAction(
  plan: SubscriptionPlan,
  current: CurrentSubscription | null,
): { kind: 'current' | 'renewal_off' | 'available'; labelAr: string } {
  if (current?.status === 'active' && current.planId === plan.id) {
    return {
      kind: 'renewal_off' as const,
      labelAr: current.renewalEnabled
        ? 'باقتك الحالية · التجديد مفعّل'
        : 'باقتك الحالية · التجديد موقوف',
    };
  }
  if (current?.status === 'pending') {
    return { kind: 'current' as const, labelAr: 'لديك طلب باقة قيد المراجعة' };
  }
  return {
    kind: 'available' as const,
    labelAr: 'الشراء الإلكتروني غير متاح بعد',
  };
}
