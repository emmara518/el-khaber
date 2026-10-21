/**
 * Phone canonicalization parity (WP-1B).
 *
 * The SAME canonical rule must govern register, login, PATCH /me and
 * forgot-password so equivalent representations of one number always
 * resolve to one identity. These pure-function cases lock the rule; the
 * e2e suite proves each route uses it.
 */

import { describe, expect, it } from 'vitest';

import { canonicalizePhone, phoneVariants } from '../dist/auth/auth.service';

describe('phone canonicalization (WP-1B)', () => {
  it.each([
    ['+201001112233', '+201001112233'],
    ['201001112233', '+201001112233'],
    ['01001112233', '+201001112233'],
    [' 0100 111 2233 ', '+201001112233'],
    ['00201001112233', '+201001112233'],
    ['+20 100 111 2233', '+201001112233'],
  ])('canonicalizes %s to %s', (input, expected) => {
    expect(canonicalizePhone(input)).toBe(expected);
  });

  it('returns canonical ∪ raw variants for identity matching', () => {
    expect(phoneVariants('+201001112233')).toEqual(['+201001112233']);
    expect(phoneVariants('01001112233')).toEqual(['+201001112233', '01001112233']);
  });
});
