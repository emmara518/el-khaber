/**
 * Batch A tests: profile mock contract.
 */

import { describe, expect, it } from 'vitest';

import { profileLocationLabel } from './location-label';
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

// Regression guard for F-05: an empty location must never render a
// dangling " - " line, and must be reported as absent (null) instead.
describe('profile location label (truthful null handling)', () => {
  it('joins only real, non-empty parts', () => {
    expect(profileLocationLabel('القاهرة', 'مدينة نصر')).toBe('القاهرة - مدينة نصر');
    expect(profileLocationLabel('القاهرة', '')).toBe('القاهرة');
    expect(profileLocationLabel('', 'مدينة نصر')).toBe('مدينة نصر');
    expect(profileLocationLabel('  ', '  ')).toBeNull();
  });

  it('returns null when both parts are missing', () => {
    expect(profileLocationLabel('', '')).toBeNull();
    expect(profileLocationLabel(null, undefined)).toBeNull();
  });
});
