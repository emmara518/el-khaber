/**
 * Vitest config for the Customer app.
 *
 * Tests cover pure unit logic (data contracts, view-model shapes,
 * small smoke imports). They do NOT render React Native components
 * because that would require adding jest-expo, a babel transform,
 * and a native module mock layer — out of scope for Task #003.
 *
 * If a future task introduces full component rendering tests, the
 * recommendation is to add jest-expo + react-test-renderer and a
 * babel config; that work belongs in a dedicated test-routing
 * task.
 */

import path from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Node-env test stub for the native keychain module (see
      // test/stubs/expo-secure-store-stub.ts). Production resolution
      // is unchanged; the app uses the real module.
      'expo-secure-store': path.resolve(
        __dirname,
        'test/stubs/expo-secure-store-stub.ts',
      ),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    testTimeout: 10_000,
  },
});
