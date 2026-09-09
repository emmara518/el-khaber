/**
 * T-C tests: filtering, lookup, transition policy, accept/reject,
 * invalid/stale/error paths, list consistency, unknown + empty.
 */

import { describe, expect, it } from 'vitest';

import {
  MockTechnicianRequestsDataSource,
  RequestActionError,
} from './mock-technician-requests-data-source';
import {
  canAccept,
  canReject,
  decideRequestAction,
  requestActionErrorAr,
} from './request-policy';
import {
  filterTechnicianRequests,
  findTechnicianRequest,
  TECHNICIAN_REQUEST_FILTERS,
} from './technician-request-types';
import { useTechnicianRequestsViewModel } from './use-technician-requests-view-model';

describe('documented transition policy (docs/07_API.md §22)', () => {
  it('accepts pending → accepted only', () => {
    expect(decideRequestAction('pending', 'accept')).toEqual({ ok: true, next: 'accepted' });
    for (const s of ['accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'] as const) {
      expect(decideRequestAction(s, 'accept').ok).toBe(false);
    }
  });

  it('rejects pending|accepted → cancelled only', () => {
    expect(decideRequestAction('pending', 'reject')).toEqual({ ok: true, next: 'cancelled' });
    expect(decideRequestAction('accepted', 'reject')).toEqual({ ok: true, next: 'cancelled' });
    for (const s of ['on_the_way', 'in_progress', 'completed', 'cancelled'] as const) {
      expect(decideRequestAction(s, 'reject').ok).toBe(false);
    }
  });

  it('marks terminal states distinctly', () => {
    expect(decideRequestAction('completed', 'accept')).toEqual({ ok: false, reason: 'terminal' });
    expect(decideRequestAction('cancelled', 'reject')).toEqual({ ok: false, reason: 'terminal' });
    expect(decideRequestAction('on_the_way', 'accept')).toEqual({ ok: false, reason: 'invalid_transition' });
  });

  it('exposes canAccept/canReject helpers', () => {
    expect(canAccept('pending')).toBe(true);
    expect(canAccept('accepted')).toBe(false);
    expect(canReject('pending')).toBe(true);
    expect(canReject('accepted')).toBe(true);
    expect(canReject('in_progress')).toBe(false);
  });

  it('maps failures to user-safe Arabic', () => {
    expect(requestActionErrorAr('stale')).toContain('لم يعد هذا الطلب متاحًا');
    expect(requestActionErrorAr('terminal')).toContain('مغلق');
    expect(requestActionErrorAr('unknown')).toContain('حاول');
  });
});

describe('request filtering + lookup', () => {
  it('covers every documented state in the filter chips', () => {
    expect(TECHNICIAN_REQUEST_FILTERS.map((f) => f.id)).toEqual(
      ['all', 'pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'],
    );
  });

  it('filters deterministically and empties cleanly', async () => {
    const requests = await new MockTechnicianRequestsDataSource().getRequests({ role: 'technician' });
    expect(filterTechnicianRequests(requests, 'all')).toHaveLength(requests.length);
    const pending = filterTechnicianRequests(requests, 'pending');
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((r) => r.status === 'pending')).toBe(true);
  });

  it('looks up by id and misses cleanly', async () => {
    const requests = await new MockTechnicianRequestsDataSource().getRequests({ role: 'technician' });
    expect(findTechnicianRequest(requests, 'tin-001')?.customerNameAr).toBe('أم نورة');
    expect(findTechnicianRequest(requests, 'nope')).toBeNull();
  });

  it('shares identities with the technician home preview', async () => {
    const requests = await new MockTechnicianRequestsDataSource().getRequests({ role: 'technician' });
    expect(findTechnicianRequest(requests, 'tin-001')).not.toBeNull();
    expect(findTechnicianRequest(requests, 'tin-002')).not.toBeNull();
  });
});

describe('accept / reject mutations', () => {
  it('accepts a pending request into accepted', async () => {
    const source = new MockTechnicianRequestsDataSource();
    const updated = await source.acceptRequest({ role: 'technician', requestId: 'tin-001' });
    expect(updated.status).toBe('accepted');
    expect(updated.statusLabelAr).toBe('مقبول');
    const list = await source.getRequests({ role: 'technician' });
    expect(findTechnicianRequest(list, 'tin-001')?.status).toBe('accepted');
  });

  it('rejects a pending and an accepted request into cancelled', async () => {
    const source = new MockTechnicianRequestsDataSource();
    expect((await source.rejectRequest({ role: 'technician', requestId: 'tin-002' })).status).toBe('cancelled');
    expect((await source.rejectRequest({ role: 'technician', requestId: 'tin-003' })).status).toBe('cancelled');
  });

  it('rejects invalid transitions without mutating', async () => {
    const source = new MockTechnicianRequestsDataSource();
    await expect(
      source.acceptRequest({ role: 'technician', requestId: 'tin-005' }),
    ).rejects.toBeInstanceOf(RequestActionError);
    await expect(
      source.rejectRequest({ role: 'technician', requestId: 'tin-006' }),
    ).rejects.toBeInstanceOf(RequestActionError);
    const list = await source.getRequests({ role: 'technician' });
    expect(findTechnicianRequest(list, 'tin-005')?.status).toBe('in_progress');
    expect(findTechnicianRequest(list, 'tin-006')?.status).toBe('completed');
  });

  it('reports stale when taken elsewhere, even for allowed states', async () => {
    const source = new MockTechnicianRequestsDataSource({ takenElsewhere: ['tin-001'] });
    const err = await source
      .acceptRequest({ role: 'technician', requestId: 'tin-001' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RequestActionError);
    expect((err as RequestActionError).code).toBe('STALE');
  });

  it('fails deterministically in failing mode and on unknown ids', async () => {
    const failing = new MockTechnicianRequestsDataSource({ failing: true });
    await expect(
      failing.acceptRequest({ role: 'technician', requestId: 'tin-001' }),
    ).rejects.toBeInstanceOf(RequestActionError);
    const source = new MockTechnicianRequestsDataSource();
    await expect(
      source.acceptRequest({ role: 'technician', requestId: 'nope' }),
    ).rejects.toBeInstanceOf(RequestActionError);
  });

  it('exposes the view-model hook', () => {
    expect(typeof useTechnicianRequestsViewModel).toBe('function');
  });
});
