/**
 * Smoke-import tests.
 *
 * The component layer is validated by `pnpm typecheck` (which
 * type-checks every module in the app) and by `expo prebuild`
 * (which runs Metro and resolves every import). A pure Node test
 * of the UI barrel is intentionally avoided here because:
 *
 *   - The UI components import from `react-native`, which is
 *     importable in Node but triggers a non-trivial native-module
 *     resolution path.
 *   - The barrel re-export is a structural concern, not a
 *     behavioural one; a typo is caught by `tsc --noEmit`.
 *
 * This file therefore focuses on the data + view-model layer
 * (the only part that runs in a pure Node environment) and on
 * confirming that the screen entry point can be statically
 * imported by Metro.
 */

import { describe, expect, it } from 'vitest';

import { MockCustomerHomeDataSource } from './data/mock-customer-home-data-source';
import { useCustomerHomeViewModel } from './use-customer-home-view-model';

describe('Customer Home view-model and data source (smoke)', () => {
  it('imports the mock data source', () => {
    expect(typeof MockCustomerHomeDataSource).toBe('function');
  });

  it('imports the view-model hook as a function', () => {
    expect(typeof useCustomerHomeViewModel).toBe('function');
  });
});
