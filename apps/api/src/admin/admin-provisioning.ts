/**
 * Admin provisioning rules (I2).
 *
 * Admin accounts are created out-of-band by an operator, never through a
 * public endpoint. This module holds the pure validation used by the
 * `create-admin` CLI and its tests.
 */

export const PROVISIONABLE_ADMIN_ROLES = [
  'super_admin',
  'operations_admin',
  'content_admin',
  'support_admin',
] as const;

export type ProvisionableAdminRole = (typeof PROVISIONABLE_ADMIN_ROLES)[number];

export const ADMIN_PASSWORD_MIN_LENGTH = 14;
const ADMIN_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AdminProvisioningInput {
  email: string;
  password: string;
  role: string;
}

export interface ValidatedAdminProvisioningInput {
  email: string;
  password: string;
  role: ProvisionableAdminRole;
}

/**
 * Validates operator input. Throws an Error with a safe, human-readable
 * message. Never echoes the password.
 */
export function validateAdminProvisioningInput(
  input: AdminProvisioningInput,
): ValidatedAdminProvisioningInput {
  const email = input.email.trim().toLowerCase();
  if (!ADMIN_EMAIL_PATTERN.test(email)) {
    throw new Error('A valid admin email is required.');
  }

  if (!(PROVISIONABLE_ADMIN_ROLES as ReadonlyArray<string>).includes(input.role)) {
    throw new Error(
      `Admin role must be one of: ${PROVISIONABLE_ADMIN_ROLES.join(', ')}. ` +
        'finance_admin is legacy and cannot be provisioned.',
    );
  }

  const password = input.password;
  if (password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    throw new Error(
      `Admin password must be at least ${String(ADMIN_PASSWORD_MIN_LENGTH)} characters.`,
    );
  }
  if (!/[A-Za-z]/u.test(password) || !/[0-9]/u.test(password)) {
    throw new Error('Admin password must contain at least one letter and one digit.');
  }

  return { email, password, role: input.role as ProvisionableAdminRole };
}
