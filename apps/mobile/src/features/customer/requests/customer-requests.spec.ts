/**
 * Batch A tests: requests filter logic + mock contract.
 * Pure logic only (Node env) — screens are verified by typecheck
 * and Expo Web runtime.
 */

import { describe, expect, it } from 'vitest';

import {
  REQUEST_FILTERS,
  filterRequestsByStatus,
  type CustomerRequestItem,
} from './customer-requests-types';
import { MockCustomerRequestsDataSource } from './mock-customer-requests-data-source';
import { useCustomerRequestsViewModel } from './use-customer-requests-view-model';

const SAMPLE: ReadonlyArray<CustomerRequestItem> = [
  {
    id: 'a', applianceAr: 'غسالة', taskAr: 'x', brandAndModel: 'y',
    technicianNameAr: 'z', technicianInitialsAr: 'ز',
    status: 'pending', statusLabelAr: 'قيد الانتظار', scheduledLabelAr: 'غدًا',
  },
  {
    id: 'b', applianceAr: 'مكيف', taskAr: 'x', brandAndModel: 'y',
    technicianNameAr: 'z', technicianInitialsAr: 'ز',
    status: 'in_progress', statusLabelAr: 'قيد التنفيذ', scheduledLabelAr: 'اليوم',
  },
  {
    id: 'c', applianceAr: 'ثلاجة', taskAr: 'x', brandAndModel: 'y',
    technicianNameAr: 'z', technicianInitialsAr: 'ز',
    status: 'completed', statusLabelAr: 'مكتمل', scheduledLabelAr: 'أمس',
  },
];

describe('request status filter', () => {
  it('returns everything for the "all" filter', () => {
    expect(filterRequestsByStatus(SAMPLE, 'all')).toHaveLength(3);
  });

  it('filters to a single lifecycle status', () => {
    expect(filterRequestsByStatus(SAMPLE, 'pending').map((r) => r.id)).toEqual(['a']);
    expect(filterRequestsByStatus(SAMPLE, 'completed').map((r) => r.id)).toEqual(['c']);
  });

  it('returns empty when nothing matches', () => {
    expect(filterRequestsByStatus(SAMPLE, 'cancelled')).toHaveLength(0);
  });

  it('exposes a filter chip for every lifecycle state', () => {
    expect(REQUEST_FILTERS.map((f) => f.id)).toEqual([
      'all', 'pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled',
    ]);
  });
});

describe('requests mock contract', () => {
  it('returns lifecycle-valid requests with Arabic labels', async () => {
    const data = await new MockCustomerRequestsDataSource().getRequests({ role: 'customer' });
    expect(data.requests.length).toBeGreaterThan(0);
    for (const r of data.requests) {
      expect(['pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled']).toContain(r.status);
      expect(r.statusLabelAr.length).toBeGreaterThan(0);
      expect(r.taskAr.length).toBeGreaterThan(0);
    }
  });

  it('exposes the view-model hook', () => {
    expect(typeof useCustomerRequestsViewModel).toBe('function');
  });
});
