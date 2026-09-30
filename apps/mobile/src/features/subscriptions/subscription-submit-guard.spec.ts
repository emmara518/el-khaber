/**
 * WP-6E duplicate-submission guard: a payment submission cannot be repeated
 * while in flight or after success (no divergent optimistic state).
 */

import { describe, expect, it } from 'vitest';

import { canSubmitPayment } from './subscription-types';

describe('subscription payment submit guard (WP-6)', () => {
  it('allows a submission only from an idle/error state', () => {
    expect(canSubmitPayment('idle')).toBe(true);
    expect(canSubmitPayment('error')).toBe(true);
  });

  it('blocks duplicate submissions while in flight or after success', () => {
    expect(canSubmitPayment('submitting')).toBe(false);
    expect(canSubmitPayment('success')).toBe(false);
  });
});
