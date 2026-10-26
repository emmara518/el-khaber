/**
 * Provision an isolated, PER-SESSION `khabir_test` database for the
 * real-HTTP E2E lane (Batch 2). The shared `docker-compose.test.yml`
 * instance is never touched.
 *
 * Isolation is enforced by a unique compose project + container name,
 * and a dedicated host port. The database name stays `khabir_test`
 * because test/http-e2e/env.ts is fail-closed on it.
 *
 *   KHABIR_TEST_SESSION_ID=batch2 node apps/api/scripts/provision-session-db.mjs
 *
 * Never point this at an existing database: it runs migrations and writes
 * the safety marker. Guards below refuse anything but a fresh local
 * session container.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';

const here = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(here, '..');
const repoRoot = resolve(apiDir, '..', '..');

const SESSION_ID_RE = /^[a-z0-9][a-z0-9-]{1,30}$/;
const PROTECTED_PORTS = new Set([5432, 5433]);

function readSession() {
  const id = (process.env.KHABIR_TEST_SESSION_ID ?? '').trim().toLowerCase();
  if (!SESSION_ID_RE.test(id)) {
    throw new Error(
      'KHABIR_TEST_SESSION_ID is required (lowercase letters/digits/dashes, 2-31 chars).',
    );
  }
  const port = Number(process.env.KHABIR_TEST_SESSION_PORT ?? '5434');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error(`KHABIR_TEST_SESSION_PORT is invalid: ${process.env.KHABIR_TEST_SESSION_PORT}`);
  }
  if (PROTECTED_PORTS.has(port)) {
    throw new Error(
      `Refusing port ${port}: it belongs to the local dev/shared database, not a session container.`,
    );
  }
  const project = `khabir-test-session-${id}`;
  const container = `${project}-db`;
  const url = `postgresql://khabir_test:khabir_test_pw@localhost:${port}/khabir_test?schema=public`;
  return { id, port, project, container, url };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(' ')}`);
  }
}

function inspectComposeProject(container) {
  const result = spawnSync(
    'docker',
    ['inspect', '--format', '{{ index .Config.Labels "com.docker.compose.project" }}', container],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

async function waitForDatabase(client, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await client.$queryRawUnsafe('SELECT 1');
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  const session = readSession();
  const composeFile = join(repoRoot, 'docker-compose.test-session.yml');
  if (!existsSync(composeFile)) {
    throw new Error(`Missing ${composeFile}`);
  }

  const owner = inspectComposeProject(session.container);
  if (owner !== null && owner !== session.project) {
    throw new Error(
      `Refusing to reuse container "${session.container}" owned by compose project "${owner}".`,
    );
  }

  const composeEnv = {
    ...process.env,
    KHABIR_TEST_SESSION_CONTAINER: session.container,
    KHABIR_TEST_SESSION_PORT: String(session.port),
  };

  console.log(`[provision-session-db] project=${session.project} port=${session.port}`);
  run('docker', ['compose', '-f', composeFile, '-p', session.project, 'up', '-d'], {
    env: composeEnv,
  });

  const client = new PrismaClient({ datasources: { db: { url: session.url } } });
  try {
    console.log('[provision-session-db] waiting for PostgreSQL…');
    await waitForDatabase(client);
  } finally {
    await client.$disconnect();
  }

  console.log('[provision-session-db] applying migrations…');
  run('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: session.url, DIRECT_URL: session.url },
    shell: process.platform === 'win32',
  });

  console.log('[provision-session-db] writing safety marker…');
  const marker = new PrismaClient({ datasources: { db: { url: session.url } } });
  try {
    await marker.$executeRawUnsafe(
      'CREATE TABLE IF NOT EXISTS test_environment_marker (token text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now())',
    );
    await marker.$executeRawUnsafe(
      "INSERT INTO test_environment_marker (token) VALUES ('khabir-test') ON CONFLICT (token) DO NOTHING",
    );
    const rows = await marker.$queryRawUnsafe(
      "SELECT token FROM test_environment_marker WHERE token = 'khabir-test'",
    );
    if (rows.length !== 1) {
      throw new Error('Safety marker verification failed after insert.');
    }
  } finally {
    await marker.$disconnect();
  }

  console.log('');
  console.log(`[provision-session-db] ready. TEST_DATABASE_URL=${session.url}`);
  console.log(`[provision-session-db] teardown: KHABIR_TEST_SESSION_ID=${session.id} node apps/api/scripts/teardown-session-db.mjs`);
}

main().catch((err) => {
  console.error('[provision-session-db] FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
});
