import { describe, expect, it } from 'vitest';

import {
  APPROVED_APPLIANCE_SLUGS,
  filterApprovedAppliances,
  isApprovedApplianceSlug,
} from './approved-appliances';

describe('approved appliance scope (MVP: 3 categories)', () => {
  it('exposes exactly washing machines, refrigerators and air conditioners', () => {
    expect([...APPROVED_APPLIANCE_SLUGS]).toEqual([
      'washing_machine',
      'refrigerator',
      'air_conditioner',
    ]);
  });

  it('accepts only approved slugs', () => {
    expect(isApprovedApplianceSlug('washing_machine')).toBe(true);
    expect(isApprovedApplianceSlug('refrigerator')).toBe(true);
    expect(isApprovedApplianceSlug('air_conditioner')).toBe(true);
  });

  it('rejects out-of-scope and empty slugs', () => {
    for (const slug of ['dishwasher', 'microwave', 'coffee_machine', 'tv_screen', 'oven', 'vacuum_cleaner', 'water_heater']) {
      expect(isApprovedApplianceSlug(slug)).toBe(false);
    }
    expect(isApprovedApplianceSlug(null)).toBe(false);
    expect(isApprovedApplianceSlug(undefined)).toBe(false);
    expect(isApprovedApplianceSlug('')).toBe(false);
  });

  it('filters a backend list to the approved scope in approved order', () => {
    const backend = [
      { slug: 'tv_screen', titleAr: 'شاشات' },
      { slug: 'air_conditioner', titleAr: 'تكييفات' },
      { slug: 'microwave', titleAr: 'ميكروويف' },
      { slug: 'washing_machine', titleAr: 'غسالات' },
      { slug: 'refrigerator', titleAr: 'ثلاجات' },
      { slug: 'water_heater', titleAr: 'سخانات' },
    ];
    expect(filterApprovedAppliances(backend).map((a) => a.slug)).toEqual([
      'washing_machine',
      'refrigerator',
      'air_conditioner',
    ]);
  });

  it('returns an empty list when nothing is approved', () => {
    expect(filterApprovedAppliances([{ slug: 'oven' }])).toEqual([]);
  });
});
