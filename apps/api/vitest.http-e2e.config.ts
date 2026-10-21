import { defineConfig } from 'vitest/config';

/**
 * Real-HTTP E2E runner (Task 10N).
 *
 * Runs ONLY the `test/http-e2e/**` specs, which boot the real NestJS app
 * against the isolated `khabir_test` PostgreSQL/PostGIS database. The specs
 * fail closed if that database is not provisioned/identified.
 *
 *   node scripts/provision-test-db.mjs   # one-time / per-session
 *   vitest run --config vitest.http-e2e.config.ts
 *
 * Files run sequentially because they share one test database and reset it.
 */
export default defineConfig({
  envDir: false,
  test: {
    globals: false,
    environment: 'node',
    include: ['test/http-e2e/**/*.http.spec.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
