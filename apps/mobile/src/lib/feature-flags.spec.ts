import { describe, expect, it } from 'vitest';

import { FEATURE_FLAGS } from './feature-flags';

describe('feature flags (M3)', () => {
  it('keeps unimplemented social auth hidden in V2.1', () => {
    expect(FEATURE_FLAGS.socialAuth).toBe(false);
  });
});
