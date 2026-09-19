/**
 * Vitest config for the Admin console.
 *
 * Tests cover the session/auth client lifecycle (storage, refresh,
 * retry, concurrency) in a node environment with stubbed `window`
 * (localStorage) and `fetch`. They do NOT render React components.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    testTimeout: 10_000,
  },
});
