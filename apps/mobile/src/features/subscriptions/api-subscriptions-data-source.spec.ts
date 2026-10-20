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
    requestMock.mockResolvedValueOnce({
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
    });

    const current = await new ApiSubscriptionsDataSource().getCurrent({ role: 'customer' });
    expect(current?.statusAr).toBe('نشطة');
    expect(current?.planNameAr).toBe('الباقة الأساسية');
    expect(current?.currency).toBe('EGP');
    // WP-7 D7: entitlement codes are never fetched/transported.
    expect(requestMock.mock.calls.some((c) => String(c[1]).includes('/me/entitlements'))).toBe(
      false,
    );
  });

  it('reads the merchant current-subscription alias and unwraps { subscription }', async () => {
    requestMock.mockResolvedValueOnce({
      data: {
        subscription: {
          id: 's1',
          status: 'active',
          startedAt: 'x',
          currentPeriodStart: 'x',
          currentPeriodEnd: '2026-11-01T00:00:00.000Z',
          renewalEnabled: true,
          cancelledAt: null,
          createdAt: 'x',
          plan: {
            id: 'p1',
            code: 'basic',
            nameAr: 'باقة التاجر الأساسية',
            nameEn: 'Merchant Basic',
            role: 'merchant',
            price: 49,
            currency: 'EGP',
            billingInterval: 'monthly',
            isActive: true,
          },
        },
        entitlements: ['products.manage'],
      },
      meta: undefined,
    });

    const current = await new ApiSubscriptionsDataSource().getCurrent({ role: 'merchant' });
    expect(current?.planNameAr).toBe('باقة التاجر الأساسية');
    expect(current?.statusAr).toBe('نشطة');
    expect(requestMock.mock.calls[0]?.[1]).toBe('/merchant/subscription/current');
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
    const [method, path, body] = requestMock.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
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

describe('ApiPaymentsDataSource proof flow (WP-Proof)', () => {
  it('requests an upload grant with the declared MIME only', async () => {
    requestMock.mockResolvedValueOnce({
      data: {
        submissionId: 'sub1',
        storageKey: 'payment-proofs/u/sub/uuid.png',
        uploadUrl: 'https://s3.example.com/put',
        requiredHeaders: { 'Content-Type': 'image/png' },
        mimeType: 'image/png',
        maxBytes: 5242880,
        expiresInSeconds: 300,
      },
    });
    const grant = await new ApiPaymentsDataSource().requestProofUploadUrl({
      submissionId: 'sub1',
      mimeType: 'image/png',
    });
    const [method, path, body] = requestMock.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(method).toBe('POST');
    expect(path).toBe('/subscriptions/sub1/proof-upload-url');
    expect(body).toEqual({ mime_type: 'image/png' });
    expect(grant.storageKey).toBe('payment-proofs/u/sub/uuid.png');
    expect(grant.requiredHeaders).toEqual({ 'Content-Type': 'image/png' });
  });

  it('refuses non-routable local upload URLs with an honest error', async () => {
    const source = new ApiPaymentsDataSource();
    await expect(
      source.putProofBytes({
        grant: {
          uploadUrl: 'local://payment-proofs/u/sub/uuid.png?expires_in=300',
          storageKey: 'payment-proofs/u/sub/uuid.png',
          requiredHeaders: {},
          maxBytes: 1,
          expiresInSeconds: 300,
          mimeType: 'image/png',
        },
        photo: { uri: 'file:///x.png', fileName: 'x.png', mimeType: 'image/png', sizeBytes: 10 },
      }),
    ).rejects.toThrow('بيئة التطوير المحلية');
  });

  it('PUTs bytes to the presigned URL and confirms the server-issued key', async () => {
    // expo-file-system is stubbed (vitest alias) to answer 200 — the
    // no-throw below proves the grant/PUT/confirm wiring, not the
    // native uploader.
    const source = new ApiPaymentsDataSource();
    await source.putProofBytes({
      grant: {
        uploadUrl: 'https://s3.example.com/put',
        storageKey: 'payment-proofs/u/sub/uuid.png',
        requiredHeaders: { 'Content-Type': 'image/png' },
        maxBytes: 5242880,
        expiresInSeconds: 300,
        mimeType: 'image/png',
      },
      photo: { uri: 'file:///x.png', fileName: 'x.png', mimeType: 'image/png', sizeBytes: 10 },
    });

    requestMock.mockResolvedValueOnce({
      data: { ...submissionDto(), proofStorageKey: 'payment-proofs/u/sub/uuid.png' },
    });
    const confirmed = await source.confirmProof({
      submissionId: 'sub1',
      storageKey: 'payment-proofs/u/sub/uuid.png',
    });
    const [method, path, body] = requestMock.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(method).toBe('POST');
    expect(path).toBe('/subscriptions/sub1/proof-confirm');
    expect(body).toEqual({ storage_key: 'payment-proofs/u/sub/uuid.png' });
    expect(confirmed.hasProof).toBe(true);
  });

  it('maps submissions without proof as proof-less', async () => {
    requestMock.mockResolvedValueOnce({ data: submissionDto() });
    const submission = await new ApiPaymentsDataSource().submitPayment({
      role: 'customer',
      planId: 'p1',
      method: 'instapay',
      transferReference: 'TRX-1',
    });
    expect(submission.hasProof).toBe(false);
  });
});
