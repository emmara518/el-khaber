/**
 * Unit tests for the zod validation schemas shared between API and clients.
 * Source: docs/10_ENGINEERING_RULES.md §22, §14.
 */

import { describe, expect, it } from 'vitest';

import {
  createLocationSchema,
  emailSchema,
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  phoneSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  roleSchema,
  updateLocationSchema,
  updateMeSchema,
} from '../../packages/shared-validation/src';
import { zodToJsonSchema } from '../src/common/openapi/zod-json-schema';

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

  it('updateMeSchema accepts either contact field', () => {
    expect(updateMeSchema.parse({ phone: '+966501234567' })).toBeTruthy();
    expect(updateMeSchema.parse({ email: 'a@b.com' })).toBeTruthy();
    expect(updateMeSchema.parse({ phone: '+966501234567', email: 'a@b.com' })).toBeTruthy();
  });

  it('updateMeSchema requires at least one field', () => {
    expect(() => updateMeSchema.parse({})).toThrow();
  });

  it('updateMeSchema strips forbidden fields (role/status/verification)', () => {
    const parsed = updateMeSchema.parse({
      email: 'a@b.com',
      role: 'merchant',
      status: 'suspended',
      phoneVerified: true,
      password: 'newpassword1',
    });
    expect(parsed).toEqual({ email: 'a@b.com' });
  });

  it('updateMeSchema rejects malformed values', () => {
    expect(() => updateMeSchema.parse({ phone: '12345' })).toThrow();
    expect(() => updateMeSchema.parse({ email: 'not-an-email' })).toThrow();
  });

  it('createLocationSchema accepts omitted coordinates and explicit null (never coerced to 0)', () => {
    const omitted = createLocationSchema.parse({ label: 'المنزل' });
    expect(omitted.latitude).toBeUndefined();
    expect(omitted.longitude).toBeUndefined();
    const nulled = createLocationSchema.parse({ label: 'المنزل', latitude: null, longitude: null });
    expect(nulled.latitude).toBeUndefined();
    expect(nulled.longitude).toBeUndefined();
  });

  it('location schemas require coordinates as a pair, never a single one', () => {
    expect(() => createLocationSchema.parse({ label: 'x', latitude: 24 })).toThrow();
    expect(() => createLocationSchema.parse({ label: 'x', longitude: 46 })).toThrow();
    expect(() => updateLocationSchema.parse({ latitude: 24 })).toThrow();
    expect(
      createLocationSchema.parse({ label: 'x', latitude: 24.7, longitude: 46.7 }),
    ).toMatchObject({ latitude: 24.7, longitude: 46.7 });
  });

  it('updateLocationSchema requires at least one field', () => {
    expect(() => updateLocationSchema.parse({})).toThrow();
    expect(updateLocationSchema.parse({ label: 'العمل' })).toBeTruthy();
  });

  it('zodToJsonSchema does not mark preprocess-wrapped optionals as required', () => {
    const create = zodToJsonSchema(createLocationSchema) as { required?: string[] };
    expect(create.required ?? []).toEqual(['label']);
    const update = zodToJsonSchema(updateLocationSchema) as { required?: string[] };
    expect(update.required).toBeUndefined();
  });
});
