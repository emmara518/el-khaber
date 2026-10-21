import { describe, expect, it } from 'vitest';

import { AVAILABILITY_LABELS_AR, availabilityLabelAr, isAvailable } from './technician-status';

describe('canonical technician availability presentation', () => {
  it('maps every server status to one Arabic label', () => {
    expect(availabilityLabelAr('available')).toBe('متاح');
    expect(availabilityLabelAr('busy')).toBe('مشغول حاليًا');
    expect(availabilityLabelAr('unavailable')).toBe('غير متاح');
    expect(Object.keys(AVAILABILITY_LABELS_AR)).toHaveLength(3);
  });

  it('treats only `available` as available (never colour-only, busy is not available)', () => {
    expect(isAvailable('available')).toBe(true);
    expect(isAvailable('busy')).toBe(false);
    expect(isAvailable('unavailable')).toBe(false);
  });
});
