/**
 * Secure admin provisioning CLI (I2).
 *
 * Security properties:
 *   - requires ALLOW_ADMIN_CREATE=true (explicit operator opt-in),
 *   - password is read from an interactive TTY with echo disabled — never
 *     from argv, environment, or piped input,
 *   - minimum 14 characters plus letter+digit policy,
 *   - role is mandatory and restricted to the four V2.1 admin roles;
 *     legacy `finance_admin` cannot be provisioned,
 *   - creation is written to the audit log (actor admin is null because
 *     this is an out-of-band provisioning action),
 *   - no password, hash, or full DATABASE_URL is ever logged.
 *
 * Usage (from apps/api):
 *   $env:ALLOW_ADMIN_CREATE='true'; pnpm admin:create
 */

import process from 'node:process';

import { PrismaClient, type AdminRole } from '@prisma/client';
import { createInterface } from 'node:readline/promises';

import {
  PROVISIONABLE_ADMIN_ROLES,
  validateAdminProvisioningInput,
} from '../src/admin/admin-provisioning';
import { hashPassword } from '../src/auth/password';

function fail(message: string): never {
  process.stderr.write(`create-admin: ${message}\n`);
  process.exit(1);
}

function readHidden(question: string): Promise<string> {
  if (process.stdin.isTTY !== true) {
    fail('an interactive TTY is required; passwords are never read from arguments or pipes.');
  }
  return new Promise<string>((resolve, reject) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';

    const cleanup = (): void => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
    };

    const onData = (chunk: string): void => {
      for (const char of chunk) {
        if (char === '\u0003') {
          cleanup();
          process.stdout.write('\n');
          reject(new Error('cancelled'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    };

    stdin.on('data', onData);
  });
}

async function main(): Promise<void> {
  if (process.env['ALLOW_ADMIN_CREATE'] !== 'true') {
    fail('refused. Set ALLOW_ADMIN_CREATE=true explicitly for this run.');
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let email = '';
  let role = '';
  let password = '';
  let confirmation = '';
  try {
    email = (await rl.question('Admin email: ')).trim();
    role = (await rl.question(`Role (${PROVISIONABLE_ADMIN_ROLES.join(' / ')}): `)).trim();
    const typed = (await rl.question('Type CREATE to confirm: ')).trim();
    if (typed !== 'CREATE') {
      fail('confirmation not provided; nothing was created.');
    }
    password = await readHidden('Password (hidden, min 14 chars): ');
    confirmation = await readHidden('Confirm password (hidden): ');
  } finally {
    rl.close();
  }

  if (password !== confirmation) {
    fail('passwords do not match; nothing was created.');
  }

  let input;
  try {
    input = validateAdminProvisioningInput({ email, password, role });
  } catch (error) {
    fail(error instanceof Error ? error.message : 'invalid input');
  }

  const prisma = new PrismaClient();
  try {
    const existing = await prisma.adminUser.findUnique({ where: { email: input.email } });
    if (existing !== null) {
      fail('an admin with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const admin = await prisma.adminUser.create({
      data: {
        email: input.email,
        passwordHash,
        role: input.role as AdminRole,
        status: 'active',
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'admin_user',
        entityId: admin.id,
        action: 'admin.provision.create',
        afterJson: { email: input.email, role: input.role },
      },
    });

    process.stdout.write(`Created ${input.role} admin ${input.email} (${admin.id}).\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : 'unexpected failure');
});
