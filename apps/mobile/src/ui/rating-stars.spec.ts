import { describe, expect, it } from 'vitest';

import { ratingSpokenLabel } from './rating-label';

describe('ratingSpokenLabel', () => {
  it('announces rating and review count as one coherent Arabic-Indic value', () => {
    expect(ratingSpokenLabel(4.5, 12)).toBe('التقييم ٤٫٥ من ٥، ١٢ مراجعة');
  });

  it('omits the count when the caller hides it', () => {
    expect(ratingSpokenLabel(4.5, 12, false)).toBe('التقييم ٤٫٥ من ٥');
  });

  it('always shows one decimal for a numeric voice', () => {
    expect(ratingSpokenLabel(5, 0)).toBe('التقييم ٥٫٠ من ٥، ٠ مراجعة');
  });
});
