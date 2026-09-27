/**
 * Onboarding brand artwork registry — the approved Splash + Onboarding
 * illustrations (Customer Splash / Onboarding experience).
 *
 * Runtime format: transparent WebP. The approved masters live in
 * `apps/public/on_board/` and are normalized into real alpha WebP in
 * `src/assets/onboarding/` exactly like the brand set
 * (`apps/public/` is the archive and is never a runtime path).
 *
 * Every entry is a static import. There is NO dynamic filesystem
 * discovery, no remote URL and no recreated/duplicated artwork.
 */

import onboardingAppliances from '../assets/onboarding/onboarding_appliances.webp';
import onboardingSplash from '../assets/onboarding/onboarding_splash.webp';
import onboardingTechnician from '../assets/onboarding/onboarding_technician.webp';

import type { ImageSourcePropType } from 'react-native';

/**
 * Canonical onboarding artwork name → runtime WebP module.
 * Keys match the approved asset names.
 */
export const onboardingAssets = {
  /** Splash / brand-opening hero (emblem + wordmark + appliance band). */
  splash: onboardingSplash,
  /** Onboarding 1 — all home-appliance services in one place. */
  appliances: onboardingAppliances,
  /** Onboarding 2 — find the right technician with confidence. */
  technician: onboardingTechnician,
} as const satisfies Record<string, ImageSourcePropType>;

/** Canonical asset name accepted by `onboardingAssets`. */
export type OnboardingAssetName = keyof typeof onboardingAssets;
