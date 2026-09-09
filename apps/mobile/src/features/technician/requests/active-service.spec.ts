/**
 * T-D tests: documented advance machine (accepted → on_the_way →
 * in_progress → completed), invalid/terminal protection, stale,
 * failing mode, list consistency through the shared source, labels.
 */

import { describe, expect, it } from 'vitest';

import {
  MockTechnicianRequestsDataSource,
  RequestActionError,
  sharedTechnicianRequestsSource,
} from './mock-technician-requests-data-source';
import {
  advanceActionLabelAr,
  nextServiceStatus,
} from './request-policy';
import { findTechnicianRequest } from './technician-request-types';
import { useTechnicianActiveServiceViewModel } from './use-technician-active-service-view-model';

describe('documented advance machine (docs/07_API.md §22)', () => {
  it('allows the forward chain accepted → on_the_way → in_progress → completed', () => {
    expect(nextServiceStatus('accepted')).toEqual({ ok: true, next: 'on_the_way' });
    expect(nextServiceStatus('on_the_way')).toEqual({ ok: true, next: 'in_progress' });
    expect(nextServiceStatus('in_progress')).toEqual({ ok: true, next: 'completed' });
  });

  it('forbids every other transition', () => {
    expect(nextServiceStatus('pending')).toEqual({ ok: false, reason: 'invalid_transition' });
    expect(nextServiceStatus('completed')).toEqual({ ok: false, reason: 'terminal' });
    expect(nextServiceStatus('cancelled')).toEqual({ ok: false, reason: 'terminal' });
  });

  it('gives an action label only for actionable states', () => {
    expect(advanceActionLabelAr('accepted')).toBe('أنا في الطريق');
    expect(advanceActionLabelAr('on_the_way')).toBe('بدء العمل على الطلب');
    expect(advanceActionLabelAr('in_progress')).toBe('إنهاء الخدمة');
    expect(advanceActionLabelAr('pending')).toBeNull();
    expect(advanceActionLabelAr('completed')).toBeNull();
    expect(advanceActionLabelAr('cancelled')).toBeNull();
  });
});

describe('advance mutations through the data source', () => {
  it('walks the full chain and keeps the list consistent', async () => {
    const source = new MockTechnicianRequestsDataSource();
    let updated = await source.advanceStatus({ role: 'technician', requestId: 'tin-003' });
    expect(updated.status).toBe('on_the_way');
    expect(updated.statusLabelAr).toBe('في الطريق');
    updated = await source.advanceStatus({ role: 'technician', requestId: 'tin-003' });
    expect(updated.status).toBe('in_progress');
    updated = await source.advanceStatus({ role: 'technician', requestId: 'tin-003' });
    expect(updated.status).toBe('completed');
    const list = await source.getRequests({ role: 'technician' });
    expect(findTechnicianRequest(list, 'tin-003')?.status).toBe('completed');
  });

  it('rejects advancing pending / terminal states without mutating', async () => {
    const source = new MockTechnicianRequestsDataSource();
    await expect(
      source.advanceStatus({ role: 'technician', requestId: 'tin-001' }),
    ).rejects.toBeInstanceOf(RequestActionError);
    await expect(
      source.advanceStatus({ role: 'technician', requestId: 'tin-006' }),
    ).rejects.toBeInstanceOf(RequestActionError);
    await expect(
      source.advanceStatus({ role: 'technician', requestId: 'tin-007' }),
    ).rejects.toBeInstanceOf(RequestActionError);
    const list = await source.getRequests({ role: 'technician' });
    expect(findTechnicianRequest(list, 'tin-001')?.status).toBe('pending');
    expect(findTechnicianRequest(list, 'tin-006')?.status).toBe('completed');
  });

  it('reports stale when taken elsewhere', async () => {
    const source = new MockTechnicianRequestsDataSource({ takenElsewhere: ['tin-003'] });
    const err = await source
      .advanceStatus({ role: 'technician', requestId: 'tin-003' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RequestActionError);
    expect((err as RequestActionError).code).toBe('STALE');
  });

  it('fails deterministically in failing mode and on unknown ids', async () => {
    const failing = new MockTechnicianRequestsDataSource({ failing: true });
    await expect(
      failing.advanceStatus({ role: 'technician', requestId: 'tin-003' }),
    ).rejects.toBeInstanceOf(RequestActionError);
    const source = new MockTechnicianRequestsDataSource();
    await expect(
      source.advanceStatus({ role: 'technician', requestId: 'nope' }),
    ).rejects.toBeInstanceOf(RequestActionError);
  });

  it('exposes the active-service view-model hook', () => {
    expect(typeof useTechnicianActiveServiceViewModel).toBe('function');
  });
});

describe('shared session source (list/detail/active consistency)', () => {
  it('is a single instance carrying session state', () => {
    expect(sharedTechnicianRequestsSource).toBeInstanceOf(MockTechnicianRequestsDataSource);
  });

  it('keeps accept results visible to later reads on the same source', async () => {
    // Uses dedicated instances (shared one is app-session state);
    // proves the boundary the shared instance relies on.
    const source = new MockTechnicianRequestsDataSource();
    await source.acceptRequest({ role: 'technician', requestId: 'tin-002' });
    const list = await source.getRequests({ role: 'technician' });
    expect(findTechnicianRequest(list, 'tin-002')?.status).toBe('accepted');
    // Accepted request now advances (T-D owns this transition).
    const advanced = await source.advanceStatus({ role: 'technician', requestId: 'tin-002' });
    expect(advanced.status).toBe('on_the_way');
  });
});
