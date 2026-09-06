/**
 * Batch A tests: profile mock contract.
 */

import { describe, expect, it } from 'vitest';

import { MockCustomerProfileDataSource } from './mock-customer-profile-data-source';
import { useCustomerProfileViewModel } from './use-customer-profile-view-model';

describe('profile mock contract', () => {
  it('returns identity, location, and counters', async () => {
    const profile = await new MockCustomerProfileDataSource().getProfile({ role: 'customer' });
    expect(profile.displayNameAr.length).toBeGreaterThan(0);
    expect(profile.cityAr.length).toBeGreaterThan(0);
    expect(profile.activeOrdersCount).toBeGreaterThanOrEqual(0);
    expect(profile.completedOrdersCount).toBeGreaterThanOrEqual(0);
    expect(profile.supportHoursAr.length).toBeGreaterThan(0);
  });

  it('exposes the view-model hook', () => {
    expect(typeof useCustomerProfileViewModel).toBe('function');
  });
});
