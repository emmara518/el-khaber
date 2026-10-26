/**
 * Tear down ONLY the per-session E2E database created by
 * provision-session-db.mjs (Batch 2).
 *
 * The container must carry the `com.docker.compose.project` label of the
 * session project, so this can never remove the shared test container,
 * khabir-dev, or anything else. The volume is dropped with the project.
 *
 *   KHABIR_TEST_SESSION_ID=batch2 node apps/api/scripts/teardown-session-db.mjs
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  return { id, port, project, container };
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

function main() {
  const session = readSession();
  const composeFile = join(repoRoot, 'docker-compose.test-session.yml');
  if (!existsSync(composeFile)) {
    throw new Error(`Missing ${composeFile}`);
  }

  const owner = inspectComposeProject(session.container);
  if (owner === null) {
    console.log(`[teardown-session-db] container "${session.container}" not found; nothing to do.`);
    return;
  }
  if (owner !== session.project) {
    throw new Error(
      `Refusing to remove "${session.container}": owned by compose project "${owner}", expected "${session.project}".`,
    );
  }

  console.log(`[teardown-session-db] removing project=${session.project} (container+volume)…`);
  const result = spawnSync(
    'docker',
    ['compose', '-f', composeFile, '-p', session.project, 'down', '-v', '--remove-orphans'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        KHABIR_TEST_SESSION_CONTAINER: session.container,
        KHABIR_TEST_SESSION_PORT: String(session.port),
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(`docker compose down failed (${result.status}).`);
  }
  if (inspectComposeProject(session.container) !== null) {
    throw new Error(`Container "${session.container}" still exists after teardown.`);
  }
  console.log('[teardown-session-db] done.');
}

try {
  main();
} catch (err) {
  console.error('[teardown-session-db] FAILED:', err instanceof Error ? err.message : err);
  process.exit(1);
}
