/**
 * Pure unit tests for the subscription domain mappers (Task 10J).
 *
 * No network: covers status copy + plan/current normalization only.
 */

import { describe, expect, it } from 'vitest';

import { mapCurrent, mapPlan, paymentStatusAr, subscriptionStatusAr } from './subscription-types';

import type { CurrentSubscriptionDto, SubscriptionPlanDto } from '@khabir/shared-types';

function plan(overrides: Partial<SubscriptionPlanDto> = {}): SubscriptionPlanDto {
  return {
    id: 'plan-1',
    code: 'TECH_PRO',
    nameAr: 'باقة المحترف',
    nameEn: 'Pro',
    price: 199,
    currency: 'EGP',
    billingInterval: 'monthly',
    role: 'technician',
    isActive: true,
    sortOrder: 1,
    ...overrides,
  };
}

function current(overrides: Partial<CurrentSubscriptionDto> = {}): CurrentSubscriptionDto {
  return {
    id: 'sub-1',
    status: 'active',
    plan: {
      id: 'plan-1',
      code: 'TECH_PRO',
      nameAr: 'باقة المحترف',
      nameEn: 'Pro',
      price: 199,
      currency: 'EGP',
      billingInterval: 'monthly',
      role: 'technician',
      isActive: true,
    },
    renewalEnabled: true,
    startedAt: '2026-08-01T00:00:00.000Z',
    currentPeriodStart: '2026-09-01T00:00:00.000Z',
    currentPeriodEnd: '2026-10-01T00:00:00.000Z',
    cancelledAt: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('subscription mappers', () => {
  it('maps a plan verbatim from the DTO', () => {
    const mapped = mapPlan(plan());
    expect(mapped.id).toBe('plan-1');
    expect(mapped.nameAr).toBe('باقة المحترف');
    expect(mapped.role).toBe('technician');
  });

  it('maps the current subscription with Arabic status + entitlements', () => {
    const mapped = mapCurrent(current(), ['priority_support']);
    expect(mapped?.statusAr).toBe('نشطة');
    expect(mapped?.planNameAr).toBe('باقة المحترف');
    expect(mapped?.planId).toBe('plan-1');
    expect(mapped?.price).toBe(199);
    expect(mapped?.currency).toBe('EGP');
    expect(mapped?.entitlements).toEqual(['priority_support']);
  });

  it('returns null when no subscription exists', () => {
    expect(mapCurrent(null, [])).toBeNull();
  });

  it('covers every documented subscription status in Arabic', () => {
    expect(subscriptionStatusAr('pending')).toBe('بانتظار التفعيل');
    expect(subscriptionStatusAr('trialing')).toBe('فترة تجريبية');
    expect(subscriptionStatusAr('past_due')).toBe('متأخرة السداد');
    expect(subscriptionStatusAr('cancelled')).toBe('ملغاة');
    expect(subscriptionStatusAr('expired')).toBe('منتهية');
  });

  it('covers every payment submission status in Arabic', () => {
    expect(paymentStatusAr('pending')).toBe('قيد المراجعة');
    expect(paymentStatusAr('approved')).toBe('مقبول');
    expect(paymentStatusAr('rejected')).toBe('مرفوض');
  });
});
