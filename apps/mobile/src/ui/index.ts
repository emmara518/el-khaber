/**
 * Reusable UI primitives for the Customer app.
 *
 * These primitives are NOT a shared cross-platform package — the
 * monorepo layout (ADR-0002) keeps UI rendering platform-specific.
 * They live in `apps/mobile/src/ui/` and are consumed by the
 * Customer feature components. The visual tokens (color, spacing,
 * radius, shadow, typography) come from `packages/ui-tokens` which
 * is the single source of visual truth (docs/04_UI_UX.md).
 */

export { Icon, ICON_SIZE_SCALE, type IconName, type IconSize } from './icon';
export { MenuRow, MenuDivider } from './menu-row';

export { Card } from './card';
export { Pill } from './pill';
export { Chip, type ChipProps, type ChipSelectionMode } from './chip';
export { Avatar } from './avatar';
export { IconText } from './icon-text';
export { RatingStars } from './rating-stars';
export { ApplianceIcon } from './appliance-icon';
export { StatusBadge } from './status-badge';
export { StatusUnit } from './status-unit';
export { BrandImage } from './brand-image';
export { brandAssets, brandAssetsByCategory, type BrandAssetName, type BrandAssetCategory } from './brand-assets';
export { onboardingAssets, type OnboardingAssetName } from './onboarding-assets';
export {
  roleSelectionAssets,
  roleSelectionAsset,
  HERO_ASPECT_RATIO,
  ROLE_ASPECT_RATIO,
  type RoleSelectionAssetName,
} from './role-selection-assets';
export {
  registrationAssets,
  REGISTRATION_HERO_ASPECT_RATIO,
  type RegistrationAssetName,
} from './registration-assets';
export { statusBrandAsset } from './status-assets';
export { type, fontFamily, type TypeRole, type FontFamilyKey } from './typography';
export { appFonts, useAppFonts } from './fonts';
export { SearchField } from './search-field';
export { FormField } from './form-field';
export { ActionButton, type ActionButtonVariant } from './action-button';
export { StatTile } from './stat-tile';
export { ListLoading, ListEmpty, ListError } from './list-states';
export { AppHeader } from './app-header';
export { PageTitle } from './page-title';
export { SectionHeading } from './section-heading';
export { ApplianceThumb } from './appliance-thumb';
export { ProductImage } from './product-image';
export { productImageDisplay, type ProductImageDisplay } from './product-image-display';
export { usePressScale, screenReveal } from './use-press-scale';
export { UnreadBadge } from './unread-badge';
export { LifecycleTimeline, type LifecycleStep, type LifecycleStepState } from './lifecycle-timeline';
