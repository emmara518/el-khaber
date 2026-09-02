/**
 * Shadow tokens.
 * Source of truth: docs/04_UI_UX.md §7.
 * Low for cards, medium for floating CTA, high for dialogs. No glassmorphism.
 */
export const shadow = {
  low: {
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  medium: {
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  high: {
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

export type ShadowToken = keyof typeof shadow;
