/**
 * WP-6B presentation tests: raw backend codes (currency/interval) must never
 * be rendered; approved values map to Arabic, unknown values are omitted.
 */

import { describe, expect, it } from 'vitest';

import { currencyLabelAr, intervalLabelAr, priceLineAr } from './subscription-presentation';

describe('subscription presentation (WP-6B)', () => {
  it('maps EGP to Arabic', () => {
    expect(currencyLabelAr('EGP')).toBe('جنيه مصري');
    expect(currencyLabelAr('egp')).toBe('جنيه مصري');
  });

  it('does not map unmapped currencies (never exposes the raw code)', () => {
    expect(currencyLabelAr('USD')).toBeNull();
    expect(currencyLabelAr('SAR')).toBeNull();
  });

  it('maps month/year intervals to Arabic', () => {
    expect(intervalLabelAr('monthly')).toBe('شهري');
    expect(intervalLabelAr('month')).toBe('شهري');
    expect(intervalLabelAr('yearly')).toBe('سنوي');
    expect(intervalLabelAr('annual')).toBe('سنوي');
  });

  it('does not map unknown intervals', () => {
    expect(intervalLabelAr('weekly')).toBeNull();
  });

  it('builds an Arabic price line with no raw tokens', () => {
    expect(priceLineAr(199, 'EGP', 'monthly')).toBe('199 جنيه مصري · شهري');
    // Unmapped currency/interval tokens are omitted, never shown raw.
    expect(priceLineAr(199, 'SAR', 'monthly')).toBe('199 · شهري');
    expect(priceLineAr(0, 'SAR', 'weekly')).toBe('0');
  });
});
