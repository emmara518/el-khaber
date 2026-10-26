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
    /** Text-only gold for light surfaces (WCAG AA). */
    goldInk: '#7A5A00',
  },
  surface: {
    base: '#FFFFFF',
    subtle: '#F7F8FA',
  },
  text: {
    primary: '#10213A',
    secondary: '#5A6675',
  },
  border: {
    default: '#E4E8EE',
  },
  success: {
    DEFAULT: '#2E9B5F',
    soft: '#EAF7EF',
    /** Text-only success on light/soft surfaces (WCAG AA). */
    ink: '#1F6B41',
  },
  error: {
    DEFAULT: '#D94A4A',
    soft: '#FDECEC',
    /** Text-only error on light/soft surfaces (WCAG AA). */
    ink: '#B3261E',
  },
  warning: {
    DEFAULT: '#C88311',
    /** Text-only warning on light/soft surfaces (WCAG AA). */
    ink: '#8A5A08',
  },
  overlay: {
    scrim: 'rgba(0, 0, 0, 0.55)',
  },
} as const;

export type ColorToken = typeof color;
