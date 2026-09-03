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

export { ScreenContainer } from './screen-container';
export { SectionHeader } from './section-header';
export { Card } from './card';
export { IconBadge } from './icon-badge';
export { Pill } from './pill';
export { Avatar } from './avatar';
export { IconText } from './icon-text';
export { RatingStars } from './rating-stars';
export { HorizontalCarousel } from './horizontal-carousel';
export { ApplianceIcon } from './appliance-icon';
export { QuickServiceIcon } from './quick-service-icon';
export { StatusBadge } from './status-badge';
