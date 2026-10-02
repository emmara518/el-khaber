import { describe, expect, it } from 'vitest';

import { tabIdForPathname } from './merchant-tab-routing';

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
