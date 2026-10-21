import { describe, expect, it } from 'vitest';

import { formatOrderReference, orderReferenceLabel } from './order-reference';

const UUID = 'efcd7a4b-2760-4d15-9f9b-27adcdd04c46';

describe('customer order reference', () => {
  it('never exposes the raw request UUID', () => {
    const reference = formatOrderReference(UUID);
    const label = orderReferenceLabel(UUID);
    expect(reference).not.toContain(UUID);
    expect(label).not.toContain(UUID);
    expect(label).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });

  it('is a short, deterministic, human-friendly reference', () => {
    expect(formatOrderReference(UUID)).toMatch(/^KH-[0-9A-F]{1,6}$/);
    expect(formatOrderReference(UUID)).toBe(formatOrderReference(UUID));
    expect(formatOrderReference(UUID)).toBe('KH-EFCD7A');
  });

  it('label uses the Arabic order-number prefix and the short reference', () => {
    expect(orderReferenceLabel(UUID)).toBe('رقم الطلب: KH-EFCD7A');
  });

  it('handles an id with no alphanumeric characters without a dangling separator', () => {
    expect(formatOrderReference('----')).toBe('KH');
  });
});
