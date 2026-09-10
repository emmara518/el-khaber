import { defineConfig } from 'vitest/config';

/**
 * vitest config for the NestJS API.
 *
 * The e2e tests import the **compiled** NestJS application from
 * `apps/api/dist` (see test/auth.e2e.spec.ts). This sidesteps the
 * TypeScript decorator-metadata issue that vitest's default esbuild
 * transformer has with raw NestJS sources. The unit tests (password,
 * token, policy, validation) exercise pure logic that has no
 * decorator metadata and run fine under the default transformer.
 */

// Belt-and-braces DB-safety (evaluated BEFORE any env-file loading):
// Vite's env loader never overrides variables that already exist on
// process.env, so pinning clearly-test-only values here guarantees the
// e2e DB-safety guard passes even if .env loading is (re)introduced.
// The guard itself remains active and will still fail the suite if a
// real Supabase URL ever wins.
process.env['DATABASE_URL'] = 'postgresql://test/test';
process.env['DIRECT_URL'] = 'postgresql://test/test';

export default defineConfig({
  // Never load .env files for tests; test values are set explicitly in
  // the config above and inside the spec files.
  envDir: false,
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': new URL('./src/', import.meta.url).pathname,
    },
  },
});
