/**
 * Regression tests for the location label mapping (CTO closure round).
 *
 * Guards the "no dangling dash" rule: when a location has no address
 * parts, the detail string must be empty so the UI omits the line
 * entirely instead of rendering a lone separator.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock('../../../lib/api-client', () => ({
  getApi: () => ({ request: requestMock }),
}));
vi.mock('../../../lib/catalog-reference', () => ({
  categoryIdBySlug: vi.fn(async () => 'aaaaaaaa-1111-4111-8111-111111111111'),
  getApplianceCategories: vi.fn(async () => []),
}));

import { ApiServiceRequestDataSource, mapLocation } from './api-service-request-data-source';
import { EMPTY_DRAFT } from './service-request-types';

import type { ServiceRequestDraft } from './service-request-types';
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

describe('submitRequest preferred appointment (Track B1)', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  function draft(overrides: Partial<ServiceRequestDraft>): ServiceRequestDraft {
    return {
      ...EMPTY_DRAFT,
      technicianId: 'tech-1',
      appliance: 'washing_machine',
      problemId: 'other',
      customProblemAr: 'عطل غامض في الغسالة',
      locationId: 'loc-1',
      ...overrides,
    };
  }

  const CREATED = { data: { id: 'req-1', technicianId: 'tech-1', createdAt: '2026-10-20T10:00:00.000Z' } };

  it('omits scheduled_at entirely when no preference is chosen', async () => {
    requestMock.mockResolvedValueOnce(CREATED);
    await new ApiServiceRequestDataSource().submitRequest(draft({}));
    const [method, path, body] = requestMock.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(method).toBe('POST');
    expect(path).toBe('/service-requests');
    expect(body).not.toHaveProperty('scheduled_at');
  });

  it('sends the preferred time as scheduled_at (ISO) when chosen', async () => {
    requestMock.mockResolvedValueOnce(CREATED);
    const preferredAtISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await new ApiServiceRequestDataSource().submitRequest(draft({ preferredAtISO }));
    const [, , body] = requestMock.mock.calls[0] as [string, string, Record<string, unknown>];
    expect(body['scheduled_at']).toBe(preferredAtISO);
  });

  it('rejects a stale preference before calling the API', async () => {
    const preferredAtISO = new Date(Date.now() - 60_000).toISOString();
    await expect(
      new ApiServiceRequestDataSource().submitRequest(draft({ preferredAtISO })),
    ).rejects.toThrow();
    expect(requestMock).not.toHaveBeenCalled();
  });
});
