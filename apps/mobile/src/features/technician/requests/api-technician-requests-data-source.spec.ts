/**
 * P0-1 regression: the technician requests list must enrich from the LIST
 * payload only — no per-row `GET /service-requests/:id` waterfall (which
 * caused burst traffic and 429s), and the location must come from the
 * summary.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));
vi.mock('../../../lib/api-client', () => ({
  getApi: () => ({ request: requestMock }),
}));
vi.mock('../../../lib/catalog-reference', () => ({
  categoryNameAr: async () => 'غسالات',
  categorySlugById: async () => 'washing_machine',
}));

import {
  ApiTechnicianRequestsDataSource,
  locationArFromSummary,
} from './api-technician-requests-data-source';

const META = { page: 1, limit: 100, total: 1, totalPages: 1, hasNext: false };

function summaryDto(): Record<string, unknown> {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    status: 'pending',
    problemTitle: 'تسرب مياه',
    problemDescription: 'تسرب',
    applianceCategoryId: '22222222-2222-2222-2222-222222222222',
    serviceId: null,
    faultId: null,
    technicianId: null,
    scheduledAt: null,
    createdAt: '2026-10-04T19:00:00.000Z',
    updatedAt: '2026-10-04T19:00:00.000Z',
    location: { label: 'المنزل', city: 'القاهرة', addressText: 'شارع النيل' },
  };
}

beforeEach(() => {
  requestMock.mockReset();
});

describe('technician requests list enrichment (P0-1)', () => {
  it('fetches the list once and reads the location from the summary (no N+1)', async () => {
    requestMock.mockResolvedValueOnce({ data: [summaryDto()], meta: META });

    const requests = await new ApiTechnicianRequestsDataSource().getRequests({ role: 'technician' });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.locationAr).toBe('المنزل – القاهرة – شارع النيل');
    expect(requests[0]?.applianceAr).toBe('غسالات');

    // Exactly one request — the list. No per-row detail waterfall.
    expect(requestMock).toHaveBeenCalledTimes(1);
    const [method, path] = requestMock.mock.calls[0] as [string, string];
    expect(method).toBe('GET');
    expect(path).toContain('/service-requests');
    expect(path).not.toMatch(/\/service-requests\/[0-9a-fA-F-]{36}/);
  });

  it('renders an empty location (no dashed placeholder) when the summary has none', async () => {
    requestMock.mockResolvedValueOnce({
      data: [{ ...summaryDto(), location: { label: null, city: null, addressText: null } }],
      meta: META,
    });

    const requests = await new ApiTechnicianRequestsDataSource().getRequests({ role: 'technician' });

    expect(requests[0]?.locationAr).toBe('');
  });

  it('tolerates a legacy summary without location (staggered rollout): no crash, still one call', async () => {
    const legacy = summaryDto();
    delete (legacy as Record<string, unknown>).location;
    requestMock.mockResolvedValueOnce({ data: [legacy], meta: META });

    const requests = await new ApiTechnicianRequestsDataSource().getRequests({ role: 'technician' });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.locationAr).toBe('');
    expect(requestMock).toHaveBeenCalledTimes(1);
  });
});

describe('locationArFromSummary', () => {
  it('joins present parts and skips blanks/whitespace', () => {
    expect(locationArFromSummary({ label: 'المنزل', city: 'القاهرة', addressText: 'شارع النيل' })).toBe(
      'المنزل – القاهرة – شارع النيل',
    );
    expect(locationArFromSummary({ label: 'المنزل', city: null, addressText: '  ' })).toBe('المنزل');
    expect(locationArFromSummary({ label: null, city: null, addressText: null })).toBe('');
  });
});
