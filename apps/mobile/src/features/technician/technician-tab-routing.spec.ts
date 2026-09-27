import { describe, expect, it } from 'vitest';

import { tabIdForPathname } from './technician-tab-routing';

describe('technician active tab resolution', () => {
  it('resolves each tab route to its destination', () => {
    expect(tabIdForPathname('/')).toBe('home');
    expect(tabIdForPathname('')).toBe('home');
    expect(tabIdForPathname('/orders')).toBe('orders');
    expect(tabIdForPathname('/orders/abc')).toBe('orders');
    expect(tabIdForPathname('/services')).toBe('services');
    expect(tabIdForPathname('/messages')).toBe('messages');
    expect(tabIdForPathname('/profile')).toBe('profile');
  });

  it('resolves non-tab routes to null (no misleading highlight)', () => {
    expect(tabIdForPathname('/onboarding')).toBeNull();
    expect(tabIdForPathname('/reviews')).toBeNull();
    expect(tabIdForPathname('/settings')).toBeNull();
    expect(tabIdForPathname('/active-service')).toBeNull();
  });
});
