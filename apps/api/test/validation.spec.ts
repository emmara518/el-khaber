/**
 * Unit tests for the zod validation schemas shared between API and clients.
 * Source: docs/10_ENGINEERING_RULES.md §22, §14.
 */

import { describe, expect, it } from 'vitest';

import {
  emailSchema,
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  phoneSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  roleSchema,
} from '../../packages/shared-validation/src';

describe('shared validation', () => {
  it('roleSchema accepts only the three end-user roles', () => {
    expect(roleSchema.parse('customer')).toBe('customer');
    expect(roleSchema.parse('technician')).toBe('technician');
    expect(roleSchema.parse('merchant')).toBe('merchant');
    expect(() => roleSchema.parse('admin')).toThrow();
  });

  it('passwordSchema enforces length and complexity', () => {
    expect(passwordSchema.parse('abcdefghij1')).toBe('abcdefghij1');
    expect(() => passwordSchema.parse('short1')).toThrow();
    expect(() => passwordSchema.parse('alllowercase')).toThrow();
    expect(() => passwordSchema.parse('1234567890')).toThrow();
  });

  it('phoneSchema rejects malformed input', () => {
    expect(phoneSchema.parse('+201234567890')).toBe('+201234567890');
    expect(() => phoneSchema.parse('abc')).toThrow();
  });

  it('emailSchema lowercases and validates', () => {
    expect(emailSchema.parse('User@Example.COM')).toBe('user@example.com');
    expect(() => emailSchema.parse('not-an-email')).toThrow();
  });

  it('registerSchema requires phone OR email, role, password', () => {
    expect(
      registerSchema.parse({ role: 'customer', email: 'a@b.com', password: 'strongpass1' }),
    ).toBeTruthy();
    expect(
      registerSchema.parse({ role: 'technician', phone: '+201234567890', password: 'strongpass1' }),
    ).toBeTruthy();
    expect(() =>
      registerSchema.parse({ role: 'customer', password: 'strongpass1' }),
    ).toThrow();
    expect(() =>
      registerSchema.parse({ role: 'admin', email: 'a@b.com', password: 'strongpass1' }),
    ).toThrow();
  });

  it('loginSchema accepts either identifier', () => {
    expect(loginSchema.parse({ email: 'a@b.com', password: 'x' })).toBeTruthy();
    expect(loginSchema.parse({ phone: '+201234567890', password: 'x' })).toBeTruthy();
  });

  it('refreshSchema requires a non-trivial token', () => {
    expect(refreshSchema.parse({ refreshToken: 'a'.repeat(40) })).toBeTruthy();
    expect(() => refreshSchema.parse({ refreshToken: 'short' })).toThrow();
  });

  it('forgotPasswordSchema requires phone OR email', () => {
    expect(forgotPasswordSchema.parse({ email: 'a@b.com' })).toBeTruthy();
    expect(() => forgotPasswordSchema.parse({})).toThrow();
  });

  it('resetPasswordSchema requires a strong new password', () => {
    expect(
      resetPasswordSchema.parse({ token: 'a'.repeat(40), password: 'newpassword1' }),
    ).toBeTruthy();
    expect(() =>
      resetPasswordSchema.parse({ token: 'a'.repeat(40), password: 'weak' }),
    ).toThrow();
  });
});
