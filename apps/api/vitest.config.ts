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
export default defineConfig({
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
