/**
 * WP-6E adapter tests: subscription/payment data sources map the backend
 * contract correctly and shape the manual-payment request without
 * fabricating proof or leaking role-specific paths.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock('../../lib/api-client', () => ({
  getApi: () => ({ request: requestMock }),
}));

import { ApiPaymentsDataSource } from './api-payments-data-source';
import { ApiSubscriptionsDataSource } from './api-subscriptions-data-source';

const META = { page: 1, limit: 100, total: 1, totalPages: 1, hasNext: false };

function planDto(): Record<string, unknown> {
  return {
    id: 'p1',
    role: 'customer',
    code: 'basic',
    nameAr: 'الباقة الأساسية',
    nameEn: 'Basic',
    billingInterval: 'monthly',
    price: 100,
    currency: 'EGP',
    isActive: true,
    sortOrder: 1,
  };
}

function submissionDto(): Record<string, unknown> {
  return {
    id: 'sub1',
    userId: 'u',
    planId: 'p1',
    subscriptionId: null,
    method: 'instapay',
    transferReference: 'TRX-1',
    proofStorageKey: null,
    status: 'pending',
    reviewedAt: null,
    createdAt: 'x',
    updatedAt: 'x',
  };
}

beforeEach(() => {
  requestMock.mockReset();
});

describe('ApiSubscriptionsDataSource (WP-6)', () => {
  it('lists plans (paginated) and maps them', async () => {
    requestMock.mockResolvedValueOnce({ data: [planDto()], meta: META });
    const plans = await new ApiSubscriptionsDataSource().getPlans({ role: 'customer' });
    expect(plans).toHaveLength(1);
    expect(plans[0]?.nameAr).toBe('الباقة الأساسية');
    const [method, path] = requestMock.mock.calls[0] as [string, string];
    expect(method).toBe('GET');
    expect(path).toContain('/subscription-plans');
  });

  it('maps the current subscription with its plan', async () => {
    requestMock
      .mockResolvedValueOnce({
        data: {
          id: 's1',
          status: 'active',
          startedAt: 'x',
          currentPeriodStart: 'x',
          currentPeriodEnd: '2026-10-01T00:00:00.000Z',
          renewalEnabled: true,
          cancelledAt: null,
          createdAt: 'x',
          plan: {
            id: 'p1',
            code: 'basic',
            nameAr: 'الباقة الأساسية',
            nameEn: 'Basic',
            role: 'customer',
            price: 100,
            currency: 'EGP',
            billingInterval: 'monthly',
            isActive: true,
          },
        },
        meta: undefined,
      })
      .mockResolvedValueOnce({ data: { entitlements: ['priority_support'] } });

    const current = await new ApiSubscriptionsDataSource().getCurrent({ role: 'customer' });
    expect(current?.statusAr).toBe('نشطة');
    expect(current?.planNameAr).toBe('الباقة الأساسية');
    expect(current?.currency).toBe('EGP');
  });
});

describe('ApiPaymentsDataSource (WP-6)', () => {
  it('submits a manual payment without fabricating proof', async () => {
    requestMock.mockResolvedValueOnce({ data: submissionDto() });
    const submission = await new ApiPaymentsDataSource().submitPayment({
      role: 'customer',
      planId: 'p1',
      method: 'instapay',
      transferReference: 'TRX-1',
    });
    expect(submission.statusAr).toBe('قيد المراجعة');
    const [method, path, body] = requestMock.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(method).toBe('POST');
    expect(path).toBe('/subscriptions');
    expect(body).toEqual({ plan_id: 'p1', method: 'instapay', transfer_reference: 'TRX-1' });
    expect(body).not.toHaveProperty('proof_storage_key');
  });

  it('uses the merchant payment alias for the merchant role', async () => {
    requestMock.mockResolvedValueOnce({ data: submissionDto() });
    await new ApiPaymentsDataSource().submitPayment({
      role: 'merchant',
      planId: 'p1',
      method: 'instapay',
      transferReference: 'TRX-1',
    });
    expect(requestMock.mock.calls[0]?.[1]).toBe('/merchant/subscription/payment');
  });
});
