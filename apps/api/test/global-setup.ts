import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readTestDatabaseUrl } from './real-db-url';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The default suite's integration specs rely on the repository reference
 * seed (appliance categories, faults, tags, inactive plans). CI already
 * runs `db:seed` before the suite; this setup mirrors that step so a local
 * run is deterministic even if a previous HTTP E2E run truncated the
 * shared test database.
 *
 * The seed is idempotent and writes reference data only - never users.
 */
export default function setup(): void {
  const databaseUrl = readTestDatabaseUrl();
  if (databaseUrl === '') {
    return;
  }

  const result = spawnSync('pnpm', ['db:seed'], {
    cwd: apiDir,
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    throw new Error(`Reference seed failed with exit code ${String(result.status)}`);
  }
}
