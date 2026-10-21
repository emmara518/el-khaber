import { describe, expect, it } from 'vitest';

import { sceneHeroMetrics } from './scene-hero-metrics';

describe('scene hero sizing contract', () => {
  it('dense is the shortest treatment (wizard/tracking stay above the fold)', () => {
    const dense = sceneHeroMetrics({ dense: true });
    const compact = sceneHeroMetrics({ compact: true });
    const large = sceneHeroMetrics();
    expect(dense.sceneHeight).toBeLessThan(compact.sceneHeight);
    expect(compact.sceneHeight).toBeLessThan(large.sceneHeight);
    expect(dense.sceneHeight).toBeLessThanOrEqual(110);
  });

  it('dense takes priority over compact and reports its density', () => {
    const both = sceneHeroMetrics({ dense: true, compact: true });
    expect(both.dense).toBe(true);
    expect(both.sceneHeight).toBe(96);
  });

  it('the large editorial hero is the default', () => {
    expect(sceneHeroMetrics().dense).toBe(false);
    expect(sceneHeroMetrics().sceneHeight).toBe(252);
  });
});
