/**
 * Typography tokens.
 * Source of truth: docs/04_UI_UX.md §4.
 * Sizes are in points (RN) / px-equivalent (web). The consuming platform
 * applies its own font scaling; this is the semantic ladder only.
 */
export const typography = {
  size: {
    display: 36,
    h1: 30,
    h2: 24,
    h3: 19,
    body: 16,
    caption: 13,
    button: 16,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  /** Suggested font family key. Mobile uses platform Arabic fonts; web
   * can wire a font face that registers under this name. */
  family: {
    sans: 'SystemArabic',
  },
} as const;

export type TypographySizeToken = keyof typeof typography.size;
export type TypographyWeightToken = keyof typeof typography.weight;
