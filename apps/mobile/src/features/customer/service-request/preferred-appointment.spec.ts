/**
 * Track B1: preferred-appointment helpers — window discipline.
 *
 * `scheduled_at` is a PREFERENCE (no availability engine): future,
 * within 14 days, composed from a local day + period. These tests pin
 * the pure composition/validation rules the screen and the adapter share.
 */

import { describe, expect, it } from 'vitest';

import {
  PREFERRED_APPOINTMENT_MAX_DAYS,
  PREFERRED_PERIODS,
  composePreferredAtISO,
  formatPreferredAppointmentAr,
  localDayId,
  preferredAppointmentDays,
  preferredAppointmentError,
  preferredDayIdFromISO,
  preferredPeriodIdFromISO,
} from './preferred-appointment';

const NOW = new Date(2026, 9, 20, 10, 30, 0);

describe('preferredAppointmentDays', () => {
  it('offers 14 days starting today with honest relative labels', () => {
    const days = preferredAppointmentDays(NOW);
    expect(days).toHaveLength(PREFERRED_APPOINTMENT_MAX_DAYS);
    expect(days[0]?.id).toBe(localDayId(NOW));
    expect(days[0]?.relativeAr).toBe('اليوم');
    expect(days[1]?.relativeAr).toBe('غدًا');
    expect(new Set(days.map((d) => d.id)).size).toBe(PREFERRED_APPOINTMENT_MAX_DAYS);
  });

  it('crosses month boundaries by local calendar, not UTC math', () => {
    const days = preferredAppointmentDays(new Date(2026, 9, 30, 23, 0, 0), 3);
    expect(days.map((d) => d.id)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });
});

describe('compose + hydrate roundtrip', () => {
  it('composes the period start hour on the chosen local day', () => {
    const iso = composePreferredAtISO('2026-10-22', 'evening');
    expect(iso).not.toBeNull();
    const date = new Date(iso as string);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(22);
    expect(date.getHours()).toBe(16);
    expect(preferredDayIdFromISO(iso)).toBe('2026-10-22');
    expect(preferredPeriodIdFromISO(iso)).toBe('evening');
  });

  it('rejects malformed day ids and unknown periods instead of guessing', () => {
    expect(composePreferredAtISO('22-10-2026', 'morning')).toBeNull();
    expect(composePreferredAtISO('2026-10-22', 'night' as never)).toBeNull();
  });

  it('hydrates nulls for absent or invalid ISO values', () => {
    expect(preferredDayIdFromISO(null)).toBeNull();
    expect(preferredPeriodIdFromISO(null)).toBeNull();
    expect(preferredDayIdFromISO('not-a-date')).toBeNull();
    expect(preferredPeriodIdFromISO('not-a-date')).toBeNull();
  });

  it('defines three ordered periods with distinct start hours', () => {
    expect(PREFERRED_PERIODS.map((p) => p.id)).toEqual(['morning', 'afternoon', 'evening']);
    expect(new Set(PREFERRED_PERIODS.map((p) => p.startHour)).size).toBe(3);
  });
});

describe('preferredAppointmentError', () => {
  it('accepts no preference (coordinate by phone) and valid windows', () => {
    expect(preferredAppointmentError(null, NOW)).toBeNull();
    const soon = new Date(NOW.getTime() + 60 * 60 * 1000).toISOString();
    expect(preferredAppointmentError(soon, NOW)).toBeNull();
    const edge = new Date(
      NOW.getTime() + PREFERRED_APPOINTMENT_MAX_DAYS * 24 * 60 * 60 * 1000 - 60_000,
    ).toISOString();
    expect(preferredAppointmentError(edge, NOW)).toBeNull();
  });

  it('rejects past times, the 14-day-plus horizon, and garbage', () => {
    expect(preferredAppointmentError(new Date(NOW.getTime() - 1000).toISOString(), NOW)).not.toBeNull();
    const beyond = new Date(
      NOW.getTime() + (PREFERRED_APPOINTMENT_MAX_DAYS * 24 * 60 * 60 * 1000) + 60_000,
    ).toISOString();
    expect(preferredAppointmentError(beyond, NOW)).toContain('14');
    expect(preferredAppointmentError('not-a-date', NOW)).not.toBeNull();
  });
});

describe('formatPreferredAppointmentAr', () => {
  it('renders an Arabic date + time without inventing a weekday', () => {
    const iso = composePreferredAtISO('2026-10-22', 'morning') as string;
    const formatted = formatPreferredAppointmentAr(iso);
    expect(formatted.length).toBeGreaterThan(0);
    expect(formatted).toContain('·');
  });
});
