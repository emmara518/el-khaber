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
  // Component-level tests (e.g. the root Error Boundary) import .tsx files.
  // Without an explicit JSX transform Vite's SSR parser receives raw JSX and
  // fails before the test module can load.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  resolve: {
    alias: {
      // Node-env test stub for the native keychain module (see
      // test/stubs/expo-secure-store-stub.ts). Production resolution
      // is unchanged; the app uses the real module.
      'expo-secure-store': path.resolve(__dirname, 'test/stubs/expo-secure-store-stub.ts'),
      // Node-env test stub for the native image picker (WP-01, see
      // test/stubs/expo-image-picker-stub.ts). Same rationale: unit
      // tests exercise pure helpers, never native UI.
      'expo-image-picker': path.resolve(__dirname, 'test/stubs/expo-image-picker-stub.ts'),
      // Node-env test stub for raw file upload (WP-Proof, see
      // test/stubs/expo-file-system-stub.ts): presigned PUTs are
      // exercised with mocked responses, never native code.
      'expo-file-system': path.resolve(__dirname, 'test/stubs/expo-file-system-stub.ts'),
      // React Native ships Flow syntax that Rollup's SSR parser cannot read.
      // Component tests need host-element shapes only; production/Metro use
      // the real module.
      'react-native': path.resolve(__dirname, 'test/stubs/react-native-stub.tsx'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    testTimeout: 10_000,
  },
});
