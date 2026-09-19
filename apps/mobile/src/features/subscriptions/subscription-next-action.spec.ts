import { describe, expect, it } from 'vitest';

import { subscribeNextAction } from './subscription-types';

import type { CurrentSubscription, SubscriptionPlan } from './subscription-types';

function plan(overrides: Partial<SubscriptionPlan> = {}): SubscriptionPlan {
  return { id: 'plan-free', code: 'FREE', nameAr: 'الباقة الأساسية', price: 0, currency: 'EGP', billingInterval: 'monthly', role: 'customer', ...overrides };
}

function current(overrides: Partial<CurrentSubscription> = {}): CurrentSubscription {
  return {
    id: 'sub-1', status: 'active', statusAr: 'نشطة', planNameAr: 'باقة المحترف', planId: 'plan-pro',
    price: 199, currency: 'EGP', billingInterval: 'monthly', renewalEnabled: true,
    currentPeriodEnd: '2026-10-01T00:00:00.000Z', entitlements: [],
    ...overrides,
  };
}

describe('subscription plan next-action mapping', () => {
  it('marks the current active plan with renewal state, never a purchase action', () => {
    const action = subscribeNextAction(plan({ id: 'plan-pro' }), current());
    expect(action.kind).toBe('renewal_off');
    expect(action.labelAr).toContain('باقتك الحالية');
  });

  it('reports renewal stopped for the current plan after cancel', () => {
    const action = subscribeNextAction(plan({ id: 'plan-pro' }), current({ renewalEnabled: false }));
    expect(action.labelAr).toContain('التجديد موقوف');
  });

  it('keeps other plans honest: available but without a purchase promise', () => {
    const action = subscribeNextAction(plan(), current());
    expect(action.kind).toBe('available');
    expect(action.labelAr).toContain('غير متاح');
  });

  it('surfaces a pending payment review instead of pretending activation', () => {
    const action = subscribeNextAction(plan(), current({ status: 'pending', statusAr: 'بانتظار التفعيل' }));
    expect(action.kind).toBe('current');
    expect(action.labelAr).toContain('قيد المراجعة');
  });
});

