import { describe, expect, it } from 'vitest';

import { isApplianceSlug } from '../../service-request/service-request-types';

/**
 * Guards the supported appliance set (PHASE 15): the four server-owned
 * categories the Customer flow understands. Dishwasher is a real
 * backend category (GET /appliance-categories).
 */
describe('supported appliance slugs', () => {
  it.each([
    'washing_machine',
    'refrigerator',
    'air_conditioner',
    'dishwasher',
    'coffee_machine',
    'microwave',
    'oven',
    'tv_screen',
    'vacuum_cleaner',
    'water_heater',
  ])('accepts %s', (slug) => {
    expect(isApplianceSlug(slug)).toBe(true);
  });

  it('rejects unknown / non-string values', () => {
    expect(isApplianceSlug('toaster')).toBe(false);
    expect(isApplianceSlug(null)).toBe(false);
    expect(isApplianceSlug(undefined)).toBe(false);
    expect(isApplianceSlug(42)).toBe(false);
  });
});
