import { describe, expect, it } from 'vitest';

import {
  buildTechnicianTimeline,
  filterTechnicianRequests,
  findTechnicianRequest,
  TECHNICIAN_LIFECYCLE,
  TECHNICIAN_REQUEST_FILTERS,
} from './technician-request-types';

import type { TechnicianRequest } from './technician-request-types';

const request = (id: string, status: TechnicianRequest['status']): TechnicianRequest => ({
  id,
  customerNameAr: 'العميل',
  applianceAr: 'مكيف',
  applianceSlug: 'air_conditioner',
  problemAr: 'صيانة',
  descriptionAr: 'وصف',
  locationAr: 'القاهرة – مدينة نصر',
  timeAr: 'اليوم',
  createdAr: 'اليوم',
  appointmentAr: null,
  status,
  statusLabelAr: 'حالة',
});

describe('technician lifecycle timeline', () => {
  it('marks the current step and keeps later steps upcoming', () => {
    const timeline = buildTechnicianTimeline('accepted');
    expect(timeline.map((s) => s.state)).toEqual(['done', 'current', 'upcoming', 'upcoming', 'upcoming']);
  });

  it('marks every step done when completed', () => {
    expect(buildTechnicianTimeline('completed').every((s) => s.state === 'done')).toBe(true);
  });

  it('marks cancelled as fully upcoming (no active branch)', () => {
    expect(buildTechnicianTimeline('cancelled').every((s) => s.state === 'upcoming')).toBe(true);
  });

  it('covers exactly the documented forward chain', () => {
    expect([...TECHNICIAN_LIFECYCLE]).toEqual([
      'pending',
      'accepted',
      'on_the_way',
      'in_progress',
      'completed',
    ]);
  });
});

describe('technician request filtering + lookup', () => {
  const rows = [
    request('1', 'pending'),
    request('2', 'accepted'),
    request('3', 'cancelled'),
  ];

  it('covers every documented state in the filter chips', () => {
    expect(TECHNICIAN_REQUEST_FILTERS.map((f) => f.id)).toEqual([
      'all',
      'pending',
      'accepted',
      'on_the_way',
      'in_progress',
      'completed',
      'cancelled',
    ]);
  });

  it('filters deterministically and finds by id', () => {
    expect(filterTechnicianRequests(rows, 'all')).toHaveLength(3);
    expect(filterTechnicianRequests(rows, 'accepted').map((r) => r.id)).toEqual(['2']);
    expect(findTechnicianRequest(rows, '3')?.id).toBe('3');
    expect(findTechnicianRequest(rows, 'missing')).toBeNull();
  });
});
