import { describe, expect, it } from 'vitest';

import { tabIdForPathname } from './customer-tab-routing';

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
