/**
 * Locked account-type catalogue — exactly three end-user roles.
 *
 * Pure module (no React Native imports) so the contract is
 * unit-testable. Rendered by `RoleCard`.
 *
 * Source: docs/01_PROJECT.md §4, docs/10_ENGINEERING_RULES.md §14.
 */

import type { BrandAssetName } from '@/ui/brand-assets';
import type { IconName } from '@/ui/icon';
import type { Role } from '@khabir/shared-types';


export interface RoleOption {
  role: Role;
  titleAr: string;
  descriptionAr: string;
  /** Feather glyph fallback (legacy). */
  icon: IconName;
  /** Approved brand user-type emblem. */
  brandAsset: BrandAssetName;
}

/** The ONLY account types selectable in the mobile app. Admin is a separate boundary. */
export const ROLE_OPTIONS: ReadonlyArray<RoleOption> = [
  { role: 'customer', titleAr: 'عميل', descriptionAr: 'اطلب صيانة لأجهزتك وتابع طلباتك', icon: 'home', brandAsset: 'customer' },
  { role: 'technician', titleAr: 'فني', descriptionAr: 'استقبل طلبات الصيانة وأدر خدماتك', icon: 'tool', brandAsset: 'technician' },
  { role: 'merchant', titleAr: 'تاجر', descriptionAr: 'اعرض منتجاتك وأدر وجودك التجاري', icon: 'shopping-bag', brandAsset: 'merchant' },
];
