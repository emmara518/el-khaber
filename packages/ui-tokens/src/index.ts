export { color } from './color';
export { spacing, pagePaddingMobile, pagePaddingMobileLarge } from './spacing';
export { radius } from './radius';
export { shadow } from './shadow';
export { typography } from './typography';

import { color } from './color';
import { spacing, pagePaddingMobile, pagePaddingMobileLarge } from './spacing';
import { radius } from './radius';
import { shadow } from './shadow';
import { typography } from './typography';

export const tokens = {
  color,
  spacing,
  pagePaddingMobile,
  pagePaddingMobileLarge,
  radius,
  shadow,
  typography,
} as const;

export type Tokens = typeof tokens;
