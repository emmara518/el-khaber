/**
 * M-A tests: merchant home fixture, verification copy, catalog
 * arithmetic, view-model hook.
 */

import { describe, expect, it } from 'vitest';

import {
  isCatalogSummaryConsistent,
  merchantVerificationCopy,
} from './merchant-home-types';
import { MockMerchantHomeDataSource } from './mock-merchant-home-data-source';
import { useMerchantHomeViewModel } from './use-merchant-home-view-model';

describe('merchant home fixture (deterministic)', () => {
  it('returns the same merchant on every call without mutation leaks', async () => {
    const source = new MockMerchantHomeDataSource();
    const first = await source.getHome({ role: 'merchant' });
    const hacked = JSON.parse(JSON.stringify(first)) as typeof first;
    (hacked.profile as { businessNameAr: string }).businessNameAr = 'MUTATED';
    const second = await source.getHome({ role: 'merchant' });
    expect(second.profile.businessNameAr).toBe('مكتبة الخبير للأجهزة');
    expect(second.role).toBe('merchant');
  });

  it('keeps the catalog arithmetic consistent', async () => {
    const home = await new MockMerchantHomeDataSource().getHome({ role: 'merchant' });
    expect(isCatalogSummaryConsistent(home.catalog)).toBe(true);
  });

  it('carries no financial metrics', async () => {
    const home = await new MockMerchantHomeDataSource().getHome({ role: 'merchant' });
    const serialized = JSON.stringify(home);
    for (const banned of ['revenue', 'sales', 'profit', 'commission', 'orders', 'turnover']) {
      expect(serialized).not.toContain(banned);
    }
  });

  it('exposes the view-model hook', () => {
    expect(typeof useMerchantHomeViewModel).toBe('function');
  });
});

describe('verification copy (icon + text, never color alone)', () => {
  it('covers verified / pending / action_required', () => {
    expect(merchantVerificationCopy('verified')).toEqual({ icon: '✓', titleAr: 'تم التحقق' });
    expect(merchantVerificationCopy('pending')).toEqual({ icon: '◷', titleAr: 'قيد المراجعة' });
    expect(merchantVerificationCopy('action_required')).toEqual({ icon: '!', titleAr: 'يحتاج إجراء' });
  });

  it('uses conservative language (no licensing claims)', async () => {
    const home = await new MockMerchantHomeDataSource().getHome({ role: 'merchant' });
    const corpus = `${merchantVerificationCopy(home.profile.verification).titleAr} ${home.profile.verificationNoteAr}`;
    for (const banned of ['مرخّص', 'حكومي', 'معتمد رسميًا', 'اعتماد رسمي']) {
      expect(corpus).not.toContain(banned);
    }
  });
});

describe('catalog summary guard', () => {
  it('rejects inconsistent counts', () => {
    expect(isCatalogSummaryConsistent({ totalProducts: 5, activeProducts: 3, inactiveProducts: 3 })).toBe(false);
    expect(isCatalogSummaryConsistent({ totalProducts: 0, activeProducts: 0, inactiveProducts: 0 })).toBe(true);
  });
});
