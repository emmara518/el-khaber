import { describe, expect, it } from 'vitest';

import {
  formatArDate,
  formatArDateTime,
  formatArDecimal,
  formatArNumber,
  formatArPrice,
  formatArTime,
  formatArYear,
  isToday,
  joinNonEmpty,
  toArabicDigits,
} from './api-format';

describe('toArabicDigits', () => {
  it('converts ASCII digits to Arabic-Indic digits', () => {
    expect(toArabicDigits(12)).toBe('١٢');
    expect(toArabicDigits(0)).toBe('٠');
  });
});

describe('formatArNumber / formatArDecimal / formatArPrice', () => {
  it('formats zero, one and grouped large counts with Arabic-Indic digits', () => {
    expect(formatArNumber(0)).toBe('٠');
    expect(formatArNumber(1)).toBe('١');
    const large = formatArNumber(1234);
    expect(large).toContain('١');
    expect(large).toContain('٢');
    expect(large).not.toMatch(/[0-9]/);
  });

  it('formats decimals with the requested fixed precision', () => {
    const decimal = formatArDecimal(4.5, 1);
    expect(decimal).toContain('٤');
    expect(decimal).not.toMatch(/[0-9]/);
    expect(formatArDecimal(5, 1)).toContain('٥');
  });

  it('keeps the documented Latin grouped price policy', () => {
    expect(formatArPrice(0)).toBe('0 جنيه');
    expect(formatArPrice(1234)).toBe('1,234 جنيه');
  });

  it('returns an empty string for non-finite input', () => {
    expect(formatArNumber(Number.NaN)).toBe('');
    expect(formatArDecimal(Number.POSITIVE_INFINITY, 1)).toBe('');
    expect(formatArPrice(Number.NEGATIVE_INFINITY)).toBe('');
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

  it('never renders "Invalid Date" for malformed input', () => {
    for (const bad of ['', 'not-a-date', '2026-13-40T99:99:99Z', 'undefined']) {
      expect(formatArTime(bad)).toBe('');
      expect(formatArDate(bad)).toBe('');
      expect(formatArDateTime(bad)).toBe('');
      expect(formatArYear(bad)).toBe('');
      expect(formatArTime(bad)).not.toContain('Invalid');
      expect(formatArDate(bad)).not.toContain('Invalid');
    }
  });
});

describe('isToday', () => {
  it('is true for now and false for a fixed past date', () => {
    expect(isToday(new Date().toISOString())).toBe(true);
    expect(isToday('2020-01-01T00:00:00Z')).toBe(false);
  });
});

describe('joinNonEmpty', () => {
  it('drops empty parts so no dangling separator remains', () => {
    expect(joinNonEmpty(['تكييفات', ''])).toBe('تكييفات');
    expect(joinNonEmpty(['', 'تكييفات'])).toBe('تكييفات');
    expect(joinNonEmpty(['أحمد', '', 'اليوم ٢:٠٥ م'])).toBe('أحمد · اليوم ٢:٠٥ م');
  });

  it('treats whitespace and null/undefined as empty', () => {
    expect(joinNonEmpty([' ', null, undefined])).toBe('');
    expect(joinNonEmpty(['قاهرة', '  ', 'غسالات'])).toBe('قاهرة · غسالات');
  });

  it('supports a custom separator', () => {
    expect(joinNonEmpty(['قاهرة', 'غسالات'], '، ')).toBe('قاهرة، غسالات');
  });
});