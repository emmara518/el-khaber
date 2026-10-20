import { describe, expect, it } from 'vitest';

import {
  ADMIN_PASSWORD_MIN_LENGTH,
  validateAdminProvisioningInput,
} from '../src/admin/admin-provisioning';

const VALID = {
  email: 'Ops.Admin@Khabir.App',
  password: 'a-very-long-Admin-Pass1',
  role: 'operations_admin',
};

describe('admin provisioning rules (I2)', () => {
  it('normalizes the email and accepts a valid role/password', () => {
    const result = validateAdminProvisioningInput(VALID);
    expect(result.email).toBe('ops.admin@khabir.app');
    expect(result.role).toBe('operations_admin');
  });

  it('rejects invalid emails', () => {
    expect(() => validateAdminProvisioningInput({ ...VALID, email: 'not-an-email' })).toThrow(
      /valid admin email/i,
    );
  });

  it('rejects unknown, legacy, or missing roles', () => {
    expect(() => validateAdminProvisioningInput({ ...VALID, role: 'customer' })).toThrow(
      /Admin role must be one of/i,
    );
    expect(() => validateAdminProvisioningInput({ ...VALID, role: 'finance_admin' })).toThrow(
      /legacy/i,
    );
    expect(() => validateAdminProvisioningInput({ ...VALID, role: '' })).toThrow(
      /Admin role must be one of/i,
    );
  });

  it(`requires at least ${String(ADMIN_PASSWORD_MIN_LENGTH)} characters`, () => {
    expect(() =>
      validateAdminProvisioningInput({ ...VALID, password: 'short-Pass1' }),
    ).toThrow(new RegExp(`at least ${String(ADMIN_PASSWORD_MIN_LENGTH)}`));
  });

  it('requires a letter and a digit', () => {
    expect(() =>
      validateAdminProvisioningInput({ ...VALID, password: 'onlyletters-password' }),
    ).toThrow(/letter and one digit/i);
    expect(() =>
      validateAdminProvisioningInput({ ...VALID, password: '12345678901234' }),
    ).toThrow(/letter and one digit/i);
  });
});
