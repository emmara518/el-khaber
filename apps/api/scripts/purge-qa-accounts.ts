/**
 * QA account purge (I2). SAFE BY DEFAULT.
 *
 * Without `--confirm` this script only reports how many `@qa.khabir.app`
 * accounts exist. Deletion requires:
 *   - ALLOW_QA_PURGE=true (explicit operator opt-in),
 *   - NODE_ENV !== 'production',
 *   - a DATABASE_URL host that is loopback / CI `postgres` / `test-db`,
 *   - the literal `--confirm` flag.
 *
 * Deletion is destructive and MUST be approved by the project owner before
 * it is run. The script never touches non-QA accounts.
 */

import process from 'node:process';

import { PrismaClient } from '@prisma/client';

const QA_DOMAIN = '@qa.khabir.app';
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'test-db']);

function fail(message: string): never {
  process.stderr.write(`purge-qa-accounts: ${message}\n`);
  process.exit(1);
}

function assertSafeTarget(): void {
  if (process.env['ALLOW_QA_PURGE'] !== 'true') {
    fail('refused. Set ALLOW_QA_PURGE=true only after explicit owner approval.');
  }
  if ((process.env['NODE_ENV'] ?? '').toLowerCase() === 'production') {
    fail('refused in production.');
  }
  const raw = process.env['DATABASE_URL'] ?? '';
  let host = '';
  try {
    host = new URL(raw).hostname.replace(/^\[|\]$/g, '').toLowerCase();
  } catch {
    fail('DATABASE_URL is not a valid URL.');
  }
  if (/supabase\.(com|co|in)/i.test(host) || !ALLOWED_HOSTS.has(host)) {
    fail(`refused host '${host}'. Only isolated test databases are allowed.`);
  }
}

async function main(): Promise<void> {
  assertSafeTarget();
  const confirm = process.argv.includes('--confirm');
  const prisma = new PrismaClient();

  try {
    const accounts = await prisma.user.findMany({
      where: { email: { endsWith: QA_DOMAIN } },
      select: { id: true, email: true },
    });

    process.stdout.write(`Found ${String(accounts.length)} QA account(s) at ${QA_DOMAIN}.\n`);

    if (!confirm) {
      process.stdout.write('Dry run only. Re-run with --confirm to delete (owner approval required).\n');
      return;
    }
    if (accounts.length === 0) {
      return;
    }

    const ids = accounts.map((account) => account.id);
    const result = await prisma.user.deleteMany({ where: { id: { in: ids } } });
    process.stdout.write(`Deleted ${String(result.count)} QA account(s).\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : 'unexpected failure');
});
