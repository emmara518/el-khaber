/**
 * Phase 1 tests: auth validation states + role selection contract.
 *
 * Pure-logic tests (Node env): mirror the shared-validation contract
 * (phone 7–15 digits, email shape, password 10–128 + letter + digit,
 * register requires role + one identity, reset requires token).
 */

import { describe, expect, it } from 'vitest';

import {
  hasErrors,
  splitIdentity,
  validateForgotInput,
  validateIdentity,
  validateLoginInput,
  validatePassword,
  validateRegisterInput,
  validateResetInput,
} from './auth-validation';
import { ROLE_OPTIONS } from './roles';

describe('role selection contract', () => {
  it('exposes exactly three roles: customer, technician, merchant', () => {
    expect(ROLE_OPTIONS.map((o) => o.role)).toEqual(['customer', 'technician', 'merchant']);
  });

  it('gives every role an Arabic title, description, and icon', () => {
    for (const option of ROLE_OPTIONS) {
      expect(option.titleAr.length).toBeGreaterThan(0);
      expect(option.descriptionAr.length).toBeGreaterThan(0);
      expect(option.icon.length).toBeGreaterThan(0);
    }
  });

  it('rejects registration without a selected role', () => {
    const errors = validateRegisterInput({
      role: null,
      identity: '0512345678',
      password: 'khabir1234',
      confirmPassword: 'khabir1234',
    });
    expect(errors.role).toBeDefined();
  });

  it('rejects unknown role values', () => {
    const errors = validateRegisterInput({
      // @ts-expect-error intentional: unknown role must fail validation
      role: 'vendor',
      identity: '0512345678',
      password: 'khabir1234',
      confirmPassword: 'khabir1234',
    });
    expect(errors.role).toBeDefined();
  });
});

describe('identity validation', () => {
  it('accepts a valid phone', () => {
    expect(validateIdentity('0512345678')).toBeNull();
    expect(validateIdentity('+966512345678')).toBeNull();
  });

  it('rejects a short phone', () => {
    expect(validateIdentity('123')).not.toBeNull();
  });

  it('accepts a valid email', () => {
    expect(validateIdentity('Tech@Khabir.sa')).toBeNull();
  });

  it('rejects a malformed email', () => {
    expect(validateIdentity('not-an-email@')).not.toBeNull();
  });

  it('requires a non-empty identity', () => {
    expect(validateIdentity('   ')).not.toBeNull();
  });

  it('splits an email identity into the auth contract shape', () => {
    expect(splitIdentity('Tech@Khabir.sa')).toEqual({ email: 'tech@khabir.sa' });
    expect(splitIdentity('0512345678')).toEqual({ phone: '0512345678' });
  });
});

describe('password validation', () => {
  it('accepts a compliant password', () => {
    expect(validatePassword('khabir1234')).toBeNull();
  });

  it('rejects short, letterless, and digitless passwords', () => {
    expect(validatePassword('kh1')).not.toBeNull();
    expect(validatePassword('kh'.padEnd(12, 'a'))).not.toBeNull();
    expect(validatePassword('abcdefghij')).not.toBeNull();
  });

  it('rejects an over-long password', () => {
    expect(validatePassword(`a1${'x'.repeat(127)}`)).not.toBeNull();
  });
});

describe('login validation states', () => {
  it('passes for a complete input', () => {
    expect(hasErrors(validateLoginInput({ identity: '0512345678', password: 'anything10' }))).toBe(false);
  });

  it('flags empty identity and empty password', () => {
    const errors = validateLoginInput({ identity: '', password: '' });
    expect(errors.identity).toBeDefined();
    expect(errors.password).toBeDefined();
  });
});

describe('register validation states', () => {
  const base = { role: 'customer' as const, identity: '0512345678', password: 'khabir1234', confirmPassword: 'khabir1234' };

  it('passes for a complete input', () => {
    expect(hasErrors(validateRegisterInput(base))).toBe(false);
  });

  it('flags mismatched confirmation', () => {
    const errors = validateRegisterInput({ ...base, confirmPassword: 'different99' });
    expect(errors.confirmPassword).toBeDefined();
  });

  it('flags a weak password', () => {
    const errors = validateRegisterInput({ ...base, password: 'short', confirmPassword: 'short' });
    expect(errors.password).toBeDefined();
  });
});

describe('forgot/reset validation states', () => {
  it('requires an identity for forgot-password', () => {
    expect(hasErrors(validateForgotInput({ identity: '' }))).toBe(true);
    expect(hasErrors(validateForgotInput({ identity: '0512345678' }))).toBe(false);
  });

  it('requires a plausible token and matching confirmation for reset', () => {
    expect(
      hasErrors(
        validateResetInput({ token: 'short', password: 'khabir1234', confirmPassword: 'khabir1234' }),
      ),
    ).toBe(true);
    expect(
      hasErrors(
        validateResetInput({
          token: 'x'.repeat(24),
          password: 'khabir1234',
          confirmPassword: 'mismatch99',
        }),
      ),
    ).toBe(true);
    expect(
      hasErrors(
        validateResetInput({ token: 'x'.repeat(24), password: 'khabir1234', confirmPassword: 'khabir1234' }),
      ),
    ).toBe(false);
  });
});
