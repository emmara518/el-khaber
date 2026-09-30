/**
 * T-A tests: technician home fixture, verification copy, view-model.
 */

import { describe, expect, it } from 'vitest';

import { MockTechnicianHomeDataSource } from './mock-technician-home-data-source';
import { availabilityLabelAr, verificationCopy } from './technician-home-types';
import { useTechnicianHomeViewModel } from './use-technician-home-view-model';

describe('technician home fixture (deterministic)', () => {
  it('returns the same persona on every call without mutation leaks', async () => {
    const source = new MockTechnicianHomeDataSource();
    const first = await source.getHome({ role: 'technician' });
    const hacked = JSON.parse(JSON.stringify(first)) as typeof first;
    (hacked.profile as { nameAr: string }).nameAr = 'MUTATED';
    (hacked.incoming as unknown[]).push({
      id: 'x', customerNameAr: 'x', applianceAr: 'x', problemAr: 'x', timeAr: 'x',
    });
    const second = await source.getHome({ role: 'technician' });
    expect(second.profile.nameAr).toBe('سامي محمود');
    expect(second.incoming).toHaveLength(2);
    expect(second.role).toBe('technician');
  });

  it('keeps identity consistent with the discovery fixture', async () => {
    const home = await new MockTechnicianHomeDataSource().getHome({ role: 'technician' });
    expect(home.profile.nameAr).toBe('سامي محمود');
    expect(home.profile.rating).toBe(4.9);
    expect(home.profile.reviewCount).toBe(213);
    expect(home.profile.specialtyAr).toBe('تبريد وتكييف');
    expect(home.profile.areasAr).toEqual(['القاهرة – مدينة نصر', 'الجيزة – الدقي']);
  });

  it('exposes the view-model hook', () => {
    expect(typeof useTechnicianHomeViewModel).toBe('function');
  });
});

describe('verification copy (icon + text, never color alone)', () => {
  it('covers verified / pending / action_required', () => {
    expect(verificationCopy('verified')).toEqual({ icon: 'check-circle', titleAr: 'تم التحقق' });
    expect(verificationCopy('pending')).toEqual({ icon: 'clock', titleAr: 'قيد المراجعة' });
    expect(verificationCopy('action_required')).toEqual({ icon: 'alert-circle', titleAr: 'يحتاج إجراء' });
  });

  it('uses conservative language (no licensing claims)', async () => {
    const home = await new MockTechnicianHomeDataSource().getHome({ role: 'technician' });
    const corpus = `${verificationCopy(home.profile.verification).titleAr} ${home.profile.verificationNoteAr}`;
    for (const banned of ['مرخّص', 'حكومي', 'معتمد رسميًا', 'اعتماد رسمي']) {
      expect(corpus).not.toContain(banned);
    }
  });
});

describe('request preview + active service', () => {
  it('previews pending incoming requests only', async () => {
    const home = await new MockTechnicianHomeDataSource().getHome({ role: 'technician' });
    expect(home.incoming.length).toBeGreaterThan(0);
    for (const item of home.incoming) {
      expect(item.customerNameAr.length).toBeGreaterThan(0);
      expect(item.problemAr.length).toBeGreaterThan(0);
      expect(item.timeAr.length).toBeGreaterThan(0);
    }
  });

  it('presents the active service with documented concepts only', async () => {
    const home = await new MockTechnicianHomeDataSource().getHome({ role: 'technician' });
    expect(home.active).not.toBeNull();
    expect(home.active?.customerNameAr).toBeTruthy();
    expect(home.active?.statusLabelAr).toBe('قيد التنفيذ');
  });

  it('reports plain counts for today (no rates or earnings)', async () => {
    const home = await new MockTechnicianHomeDataSource().getHome({ role: 'technician' });
    expect(Number.isInteger(home.today.newRequests)).toBe(true);
    expect(Number.isInteger(home.today.inProgress)).toBe(true);
    expect(Number.isInteger(home.today.completedToday)).toBe(true);
    expect(JSON.stringify(home.today)).not.toContain('rate');
    expect(JSON.stringify(home.today)).not.toContain('earning');
  });
});

describe('availability (WP-4)', () => {
  it('maps the approved labels (busy reserved, safe display only)', () => {
    expect(availabilityLabelAr('available')).toBe('متاح');
    expect(availabilityLabelAr('unavailable')).toBe('غير متاح');
    expect(availabilityLabelAr('busy')).toBe('مشغول حاليًا');
  });

  it('persists the technician toggle and reads it back (server truth)', async () => {
    const source = new MockTechnicianHomeDataSource();
    expect((await source.getHome({ role: 'technician' })).profile.available).toBe(true);

    const off = await source.setAvailability({ role: 'technician', available: false });
    expect(off.availabilityStatus).toBe('unavailable');
    const afterOff = await source.getHome({ role: 'technician' });
    expect(afterOff.profile.available).toBe(false);
    expect(afterOff.profile.availabilityLabelAr).toBe('غير متاح');

    const on = await source.setAvailability({ role: 'technician', available: true });
    expect(on.availabilityStatus).toBe('available');
    const afterOn = await source.getHome({ role: 'technician' });
    expect(afterOn.profile.available).toBe(true);
    expect(afterOn.profile.availabilityLabelAr).toBe('متاح');
  });

  it('a failed mutation rejects without mutating state (no divergent optimistic UI)', async () => {
    const source = new MockTechnicianHomeDataSource('failing');
    await expect(
      source.setAvailability({ role: 'technician', available: false }),
    ).rejects.toBeTruthy();
    // The server-backed state is unchanged.
    expect((await source.getHome({ role: 'technician' })).profile.available).toBe(true);
  });
});
