import { test } from '@e2e-dev/web';

import { requireApiUp } from './helpers';

/**
 * Explicit fail-closed preflight.
 *
 * This test exists so an unreachable API produces a clear failure in the
 * report instead of a suite that silently marks every guarded test passed.
 */
test('api preflight: target API is reachable', async () => {
  await requireApiUp();
});
