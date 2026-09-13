import { describe, expect, it } from 'vitest';

import { formatArDate, formatArDateTime, formatArTime, formatArYear, isToday, toArabicDigits } from './api-format';

describe('toArabicDigits', () => {
  it('converts ASCII digits to Arabic-Indic digits', () => {
    expect(toArabicDigits(12)).toBe('١٢');
    expect(toArabicDigits(0)).toBe('٠');
  });
});

describe('formatAr*', () => {
  it('formats a fixed timestamp without crashing (Arabic locale)', () => {
    const time = formatArTime('2026-09-04T02:00:00+03:00');
    expect(time.length).toBeGreaterThan(0);
  });

  it('renders the month name for a date', () => {
    expect(formatArDate('2026-09-04T00:00:00+03:00')).toContain('سبتمبر');
  });

  it('renders "اليوم" for today', () => {
    const now = new Date();
    expect(formatArDateTime(new Date(now.getTime() + 5_000).toISOString())).toContain('اليوم');
  });

  it('renders a year for member-since copy', () => {
    expect(formatArYear('2025-03-01T00:00:00Z')).toBe('٢٠٢٥');
  });
});

describe('isToday', () => {
  it('is true for now and false for a fixed past date', () => {
    expect(isToday(new Date().toISOString())).toBe(true);
    expect(isToday('2020-01-01T00:00:00Z')).toBe(false);
  });
});