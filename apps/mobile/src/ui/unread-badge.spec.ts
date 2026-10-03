import { describe, expect, it } from 'vitest';

import { unreadBadgeLabel } from './unread-badge-label';

describe('unreadBadgeLabel', () => {
  it('renders the plain count for small values', () => {
    expect(unreadBadgeLabel(1)).toBe('1');
    expect(unreadBadgeLabel(9)).toBe('9');
    expect(unreadBadgeLabel(99)).toBe('99');
  });

  it('saturates counts above 99 so the badge never grows unbounded', () => {
    expect(unreadBadgeLabel(100)).toBe('99+');
    expect(unreadBadgeLabel(4321)).toBe('99+');
  });

  it('defers to a caller formatter for locale numeral systems', () => {
    const arabic = (n: number) => n.toLocaleString('ar-EG');
    expect(unreadBadgeLabel(7, arabic)).toBe('٧');
    expect(unreadBadgeLabel(100, arabic)).toBe('١٠٠');
  });
});
