/**
 * Provision the isolated `khabir_test` database used by the real-HTTP E2E
 * suite (Task 10N).
 *
 * Steps (idempotent):
 *   1. start the ephemeral PostGIS container (docker-compose.test.yml)
 *   2. wait until it accepts connections
 *   3. apply the Prisma migrations to khabir_test
 *   4. write the safety marker row the harness verifies
 *
 * Safety: this script ONLY ever targets the fixed local test URL. It
 * refuses to run if the resolved URL is not the local ephemeral instance,
 * so it can never touch khabir-dev or production.
 *
 *   node apps/api/scripts/provision-test-db.mjs
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

const here = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(here, '..');
const repoRoot = resolve(apiDir, '..', '..');

const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://khabir_test:khabir_test_pw@localhost:55432/khabir_test?schema=public';

function assertLocalTestUrl(url) {
  const parsed = new URL(url);
  const db = parsed.pathname.replace(/^\//, '');
  const okHost = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  if (!okHost || db !== 'khabir_test') {
    throw new Error(
      `Refusing to provision: ${url} is not the local khabir_test instance. This guard prevents running migrations against khabir-dev/production.`,
    );
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(' ')}`);
  }
}

async function waitForDatabase(client, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await client.$queryRawUnsafe('SELECT 1');
      return;
    } catch (err) {
      if (i === attempts - 1) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  assertLocalTestUrl(TEST_URL);

  const composeFile = join(repoRoot, 'docker-compose.test.yml');
  if (!existsSync(composeFile)) {
    throw new Error(`Missing ${composeFile}`);
  }

  console.log('[provision-test-db] starting container…');
  run('docker', ['compose', '-f', composeFile, 'up', '-d']);

  const client = new PrismaClient({ datasources: { db: { url: TEST_URL } } });
  try {
    console.log('[provision-test-db] waiting for PostgreSQL…');
    await waitForDatabase(client);
  } finally {
    await client.$disconnect();
  }

  console.log('[provision-test-db] applying migrations…');
  const prismaEnv = { ...process.env, DATABASE_URL: TEST_URL, DIRECT_URL: TEST_URL };
  run('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: apiDir,
    env: prismaEnv,
    // pnpm is a .cmd shim on Windows and needs a shell to spawn.
    shell: process.platform === 'win32',
  });

  console.log('[provision-test-db] writing safety marker…');
  const marker = new PrismaClient({ datasources: { db: { url: TEST_URL } } });
  try {
    await marker.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS test_environment_marker (token text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now())',
    );
    await marker.$executeRawUnsafe(
      "INSERT INTO test_environment_marker (token) VALUES ('khabir-test') ON CONFLICT (token) DO NOTHING",
    );
  } finally {
    await marker.$disconnect();
  }

  console.log('[provision-test-db] done. TEST_DATABASE_URL =', TEST_URL);
}

main().catch((err) => {
  console.error('[provision-test-db] FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
