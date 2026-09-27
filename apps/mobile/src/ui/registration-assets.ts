/**
 * Registration artwork registry — the approved Customer registration hero.
 *
 * Runtime format: transparent WebP. The approved master lives in
 * `apps/public/on_board/registration/` and is normalized into a real
 * alpha WebP in `src/assets/registration/` (same archive → runtime
 * pattern as the brand / onboarding / role-selection sets; `apps/public`
 * is never a runtime path).
 */

import heroAppliances from '../assets/registration/hero_appliances.webp';

import type { ImageSourcePropType } from 'react-native';

export const registrationAssets = {
  /** Appliance hero anchoring the registration screen to the service identity. */
  heroAppliances,
} as const satisfies Record<string, ImageSourcePropType>;

/** Canonical asset name accepted by `registrationAssets`. */
export type RegistrationAssetName = keyof typeof registrationAssets;

/** Intrinsic aspect ratio (width / height) of the registration hero. */
export const REGISTRATION_HERO_ASPECT_RATIO = 3 / 2;
