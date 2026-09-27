import { describe, expect, it } from 'vitest';

import { availabilityLineAr } from './customer-home-types';

describe('appliance availability line (TASK-040)', () => {
  it('omits the line when the count is unknown (never a false zero)', () => {
    expect(availabilityLineAr(null, 'فني متاح')).toBeNull();
  });

  it('states "no technicians" only for a confirmed zero', () => {
    expect(availabilityLineAr(0, 'فني متاح')).toBe('لا يوجد فنيون');
  });

  it('renders the real count with the availability suffix', () => {
    expect(availabilityLineAr(3, 'فني متاح')).toBe('3 فني متاح');
  });
});
