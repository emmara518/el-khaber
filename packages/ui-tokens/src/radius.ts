/**
 * Radius scale.
 * Source of truth: docs/04_UI_UX.md §6.
 */
export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;
