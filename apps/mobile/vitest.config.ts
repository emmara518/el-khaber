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
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
    testTimeout: 10_000,
  },
});
