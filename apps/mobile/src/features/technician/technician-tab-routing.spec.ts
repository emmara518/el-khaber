import { describe, expect, it } from 'vitest';

import { isTechnicianFlowRoute, tabIdForPathname } from './technician-tab-routing';

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

describe('technician isolated full-screen flows (no global tab bar)', () => {
  it('hides the tab bar for onboarding, request detail, active service, reviews and settings', () => {
    expect(isTechnicianFlowRoute('/onboarding')).toBe(true);
    expect(isTechnicianFlowRoute('/orders/req-123')).toBe(true);
    expect(isTechnicianFlowRoute('/active-service')).toBe(true);
    expect(isTechnicianFlowRoute('/reviews')).toBe(true);
    expect(isTechnicianFlowRoute('/settings')).toBe(true);
  });

  it('keeps the tab bar on role root/tab surfaces', () => {
    expect(isTechnicianFlowRoute('/')).toBe(false);
    expect(isTechnicianFlowRoute('/orders')).toBe(false);
    expect(isTechnicianFlowRoute('/services')).toBe(false);
    expect(isTechnicianFlowRoute('/messages')).toBe(false);
    expect(isTechnicianFlowRoute('/profile')).toBe(false);
    expect(isTechnicianFlowRoute('/notifications')).toBe(false);
  });
});
