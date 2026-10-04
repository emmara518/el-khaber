/**
 * SceneHero sizing contract (pure, no React Native imports).
 *
 * Keeps the cinematic hero compact by default across surfaces. `dense`
 * is the wizard/tracking treatment where functional content must stay
 * above the fold; `compact` is the terminal/status treatment; the
 * default is the large editorial hero.
 */

export interface SceneHeroMetrics {
  readonly sceneHeight: number;
  readonly imageOverlap: number;
  readonly dense: boolean;
}

export function sceneHeroMetrics(input: { dense?: boolean; compact?: boolean } = {}): SceneHeroMetrics {
  if (input.dense) {
    return { sceneHeight: 96, imageOverlap: 40, dense: true };
  }
  if (input.compact) {
    return { sceneHeight: 148, imageOverlap: 80, dense: false };
  }
  return { sceneHeight: 252, imageOverlap: 80, dense: false };
}
