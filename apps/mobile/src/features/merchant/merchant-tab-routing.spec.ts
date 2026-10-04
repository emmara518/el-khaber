import { describe, expect, it } from 'vitest';

import { isMerchantFlowRoute, tabIdForPathname } from './merchant-tab-routing';

describe('merchant active-tab resolution', () => {
  it('maps tab roots and their detail routes to the owning tab', () => {
    expect(tabIdForPathname('/')).toBe('home');
    expect(tabIdForPathname('')).toBe('home');
    expect(tabIdForPathname('/products')).toBe('products');
    expect(tabIdForPathname('/products/new')).toBe('products');
    expect(tabIdForPathname('/products/mp-001')).toBe('products');
    expect(tabIdForPathname('/messages')).toBe('messages');
    expect(tabIdForPathname('/profile')).toBe('profile');
  });

  it('returns null for non-tab routes (no misleading active tab)', () => {
    expect(tabIdForPathname('/onboarding')).toBeNull();
    expect(tabIdForPathname('/settings')).toBeNull();
    expect(tabIdForPathname('/notifications')).toBeNull();
  });
});

describe('merchant isolated full-screen flows (no global tab bar)', () => {
  it('hides the tab bar for onboarding, product detail/form and settings', () => {
    expect(isMerchantFlowRoute('/onboarding')).toBe(true);
    expect(isMerchantFlowRoute('/products/new')).toBe(true);
    expect(isMerchantFlowRoute('/products/mp-001')).toBe(true);
    expect(isMerchantFlowRoute('/products/mp-001/edit')).toBe(true);
    expect(isMerchantFlowRoute('/settings')).toBe(true);
  });

  it('keeps the tab bar on role root/tab surfaces', () => {
    expect(isMerchantFlowRoute('/')).toBe(false);
    expect(isMerchantFlowRoute('/products')).toBe(false);
    expect(isMerchantFlowRoute('/messages')).toBe(false);
    expect(isMerchantFlowRoute('/profile')).toBe(false);
    expect(isMerchantFlowRoute('/notifications')).toBe(false);
  });
});
