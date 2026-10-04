/**
 * Regression tests for the location label mapping (CTO closure round).
 *
 * Guards the "no dangling dash" rule: when a location has no address
 * parts, the detail string must be empty so the UI omits the line
 * entirely instead of rendering a lone separator.
 */

import { describe, expect, it } from 'vitest';

import { mapLocation } from './api-service-request-data-source';

import type { LocationDto } from '@khabir/shared-types';

function dto(overrides: Partial<LocationDto>): LocationDto {
  return {
    id: 'loc-1',
    label: 'المنزل',
    addressText: null,
    city: null,
    region: null,
    ...overrides,
  } as LocationDto;
}

describe('mapLocation detail text', () => {
  it('returns an empty detail when no address parts exist (no dangling dash)', () => {
    const mapped = mapLocation(dto({}), false);
    expect(mapped.detailAr).toBe('');
    expect(mapped.labelAr).toBe('المنزل');
  });

  it('joins present parts with an Arabic comma and skips absent ones', () => {
    const mapped = mapLocation(dto({ addressText: 'شارع النيل', city: 'القاهرة' }), false);
    expect(mapped.detailAr).toBe('شارع النيل، القاهرة');
  });

  it('treats empty strings as absent', () => {
    const mapped = mapLocation(dto({ addressText: '', city: 'الجيزة', region: '' }), false);
    expect(mapped.detailAr).toBe('الجيزة');
  });

  it('falls back to a neutral label when none is provided', () => {
    const mapped = mapLocation(dto({ label: null }), true);
    expect(mapped.labelAr).toBe('موقع');
    expect(mapped.isDefault).toBe(true);
  });
});
