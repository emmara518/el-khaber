import { describe, expect, it } from 'vitest';

import { ratingSpokenLabel } from './rating-label';

describe('ratingSpokenLabel', () => {
  it('announces rating and review count as one coherent value', () => {
    expect(ratingSpokenLabel(4.5, 12)).toBe('التقييم 4.5 من 5، 12 مراجعة');
  });

  it('omits the count when the caller hides it', () => {
    expect(ratingSpokenLabel(4.5, 12, false)).toBe('التقييم 4.5 من 5');
  });

  it('always shows one decimal for a numeric voice', () => {
    expect(ratingSpokenLabel(5, 0)).toBe('التقييم 5.0 من 5، 0 مراجعة');
  });
});
