import { describe, expect, it } from 'vitest';

import { isCustomerFlowRoute, tabIdForPathname } from './customer-tab-routing';

describe('customer active-tab resolution', () => {
  it('maps tab roots and their detail routes to the owning tab', () => {
    expect(tabIdForPathname('/')).toBe('home');
    expect(tabIdForPathname('/requests')).toBe('requests');
    expect(tabIdForPathname('/requests/abc-123')).toBe('requests');
    expect(tabIdForPathname('/maintenance')).toBe('maintenance');
    expect(tabIdForPathname('/messages')).toBe('messages');
    expect(tabIdForPathname('/profile')).toBe('profile');
  });

  it('returns null for non-tab routes (no misleading active tab)', () => {
    expect(tabIdForPathname('/technician/tech-1')).toBeNull();
    expect(tabIdForPathname('/request-service')).toBeNull();
    expect(tabIdForPathname('/subscription')).toBeNull();
  });
});

describe('isolated full-screen flows (no global tab bar)', () => {
  it('hides the tab bar for the request wizard and order tracking', () => {
    expect(isCustomerFlowRoute('/request-service')).toBe(true);
    expect(isCustomerFlowRoute('/requests/req-123')).toBe(true);
  });

  it('keeps the tab bar for ordinary tab routes and non-flow screens', () => {
    expect(isCustomerFlowRoute('/')).toBe(false);
    expect(isCustomerFlowRoute('/requests')).toBe(false);
    expect(isCustomerFlowRoute('/maintenance')).toBe(false);
    expect(isCustomerFlowRoute('/messages')).toBe(false);
    expect(isCustomerFlowRoute('/profile')).toBe(false);
    expect(isCustomerFlowRoute('/technician/tech-1')).toBe(false);
    expect(isCustomerFlowRoute('/subscription')).toBe(false);
  });
});
