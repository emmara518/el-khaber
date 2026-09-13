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
    renewalEnabled: dto.renewalEnabled,
    currentPeriodEnd: dto.currentPeriodEnd,
    entitlements,
  };
}
