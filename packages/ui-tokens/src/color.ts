/**
 * Color tokens.
 * Source of truth: docs/04_UI_UX.md §3.
 * Adding or changing values requires updating the constitution and creating an ADR.
 */
export const color = {
  brand: {
    navy: '#0B1F3A',
    navyDeep: '#06172D',
    gold: '#E9A824',
    goldSoft: '#F7E7BD',
  },
  surface: {
    base: '#FFFFFF',
    subtle: '#F7F8FA',
  },
  text: {
    primary: '#10213A',
    secondary: '#697586',
  },
  border: {
    default: '#E4E8EE',
  },
  success: {
    DEFAULT: '#2E9B5F',
    soft: '#EAF7EF',
  },
  error: {
    DEFAULT: '#D94A4A',
    soft: '#FDECEC',
  },
  warning: {
    DEFAULT: '#C88311',
  },
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.55)',
  },
} as const;

export type ColorToken = typeof color;
