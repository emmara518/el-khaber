/**
 * Spacing scale (4px rhythm).
 * Source of truth: docs/04_UI_UX.md §5.
 */
export const spacing = {
  '0': 0,
  '1': 4,
  '2': 8,
  '3': 12,
  '4': 16,
  '5': 20,
  '6': 24,
  '8': 32,
  '10': 40,
  '12': 48,
} as const;

export type SpacingToken = keyof typeof spacing;
export type SpacingValue = (typeof spacing)[SpacingToken];

/** Default page horizontal padding (mobile). Source: docs/04_UI_UX.md §5. */
export const pagePaddingMobile = 16 as const;
export const pagePaddingMobileLarge = 20 as const;
