/**
 * Launch the isolated real-HTTP E2E suite (Task 10N).
 *
 * The test database URL defaults to the documented LOCAL ephemeral
 * `khabir_test` container. The harness independently re-validates the URL
 * (local host, khabir_test name, no Supabase, marker row present) and
 * fails closed if anything is off.
 *
 *   node scripts/provision-test-db.mjs   # ensure DB + migrations
 *   node scripts/run-http-e2e.mjs        # run the suite
 */

import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(here, '..');
const shell = process.platform === 'win32';

const testUrl =
  process.env.TEST_DATABASE_URL ??
  'postgresql://khabir_test:khabir_test_pw@localhost:55432/khabir_test?schema=public';

// The harness imports the COMPILED app from dist/. Force a fresh emit so a
// prior `nest build` (which deletes dist) followed by a stale incremental
// tsbuildinfo can never leave dist missing.
rmSync(join(apiDir, 'tsconfig.tsbuildinfo'), { force: true });
const compile = spawnSync('pnpm', ['exec', 'tsc', '-p', 'tsconfig.json'], {
  cwd: apiDir,
  stdio: 'inherit',
  shell,
});
if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

const result = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', '--config', 'vitest.http-e2e.config.ts'],
  {
    cwd: apiDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, TEST_DATABASE_URL: testUrl },
  },
);

process.exit(result.status ?? 1);
