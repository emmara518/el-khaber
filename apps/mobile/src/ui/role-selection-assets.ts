/**
 * Role-selection artwork registry — the approved WEBP set for the
 * Customer "Choose Account Type" screen.
 *
 * Runtime format: transparent WebP. The approved masters live in
 * `apps/public/on_board/role_selection/` and are normalized into real
 * alpha WebP in `src/assets/role-selection/` (same archive → runtime
 * pattern as the brand and onboarding sets; `apps/public/` is never a
 * runtime path).
 *
 * Every entry is a static import — no dynamic discovery, no remote URL,
 * no recreated artwork.
 */

import heroAppliances from '../assets/role-selection/hero_appliances.webp';
import roleCustomer from '../assets/role-selection/role_customer.webp';
import roleMerchant from '../assets/role-selection/role_merchant.webp';
import roleTechnician from '../assets/role-selection/role_technician.webp';

import type { Role } from '@khabir/shared-types';
import type { ImageSourcePropType } from 'react-native';

export const roleSelectionAssets = {
  /** Hero scene: home appliances, trust shield, tools, gold orbit. */
  heroAppliances,
  roleCustomer,
  roleTechnician,
  roleMerchant,
} as const satisfies Record<string, ImageSourcePropType>;

/** Canonical asset name accepted by `roleSelectionAssets`. */
export type RoleSelectionAssetName = keyof typeof roleSelectionAssets;

/** Intrinsic aspect ratio (width / height) of the hero artwork. */
export const HERO_ASPECT_RATIO = 1672 / 941;

/** Intrinsic aspect ratio (width / height) of every role card artwork. */
export const ROLE_ASPECT_RATIO = 1312 / 1199;

const ROLE_ASSET: Record<Role, RoleSelectionAssetName> = {
  customer: 'roleCustomer',
  technician: 'roleTechnician',
  merchant: 'roleMerchant',
};

/** The approved role artwork for a role. */
export function roleSelectionAsset(role: Role): ImageSourcePropType {
  return roleSelectionAssets[ROLE_ASSET[role]];
}
