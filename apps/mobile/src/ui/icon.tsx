/**
 * El-Khabir icon system.
 *
 * Single source of truth for every icon in the app. Built on the
 * Feather icon family (established, 24px grid, uniform 2px stroke)
 * so all icons share one visual language: consistent optical size,
 * stroke weight and rounded caps. Emoji / text-glyph icons are
 * forbidden (docs/04_UI_UX.md §9).
 *
 * Usage:
 *   <Icon name="home" size={24} color={color.text.secondary} />
 * Sizes map to a deliberate scale: 16 (inline), 20 (rows/lists),
 * 24 (navigation), 28 (hero/empty states).
 */

import Feather from '@expo/vector-icons/Feather';
import { color } from '@khabir/ui-tokens';

import { iconIsAccessible } from './icon-a11y';

import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

export type IconName = ComponentProps<typeof Feather>['name'];

const ICON_SIZE_SCALE = { sm: 16, md: 20, nav: 24, lg: 28 } as const;

export type IconSize = keyof typeof ICON_SIZE_SCALE;

interface IconProps {
  name: IconName;
  size?: IconSize | number;
  color?: string;
  style?: StyleProp<TextStyle>;
  /** Screen-reader label; omit when adjacent text already conveys it. */
  accessibilityLabel?: string;
  /**
   * Whether the icon is its own accessibility element. Defaults to `false`
   * (decorative) unless an `accessibilityLabel` is provided, so unlabelled
   * glyphs never become stray focus targets or duplicate their parent's
   * announcement.
   */
  accessible?: boolean;
}

export function Icon({ name, size = 'md', color: tint, style, accessibilityLabel, accessible }: IconProps) {
  const px = typeof size === 'number' ? size : ICON_SIZE_SCALE[size];
  const isAccessible = iconIsAccessible(accessibilityLabel, accessible);
  return (
    <Feather
      name={name}
      size={px}
      color={tint ?? color.text.primary}
      style={style}
      accessible={isAccessible}
      accessibilityLabel={isAccessible ? accessibilityLabel : undefined}
      allowFontScaling
    />
  );
}

export { ICON_SIZE_SCALE };
