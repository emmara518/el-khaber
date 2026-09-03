import { color, radius, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import type { ApplianceSlug } from '../features/customer/home/data/customer-home-types';

interface ApplianceIconProps {
  slug: ApplianceSlug;
  /** Card background; defaults to surface.subtle. */
  background?: string;
  size?: number;
}

/**
 * Inline stylized illustration of an appliance. The reference design
 * uses an off-white tile per appliance. We render a circular tinted
 * tile with the appliance's first Arabic letter and a subtle border
 * to keep the visual weight consistent without bundling image assets.
 */
export function ApplianceIcon({ slug, background, size = 64 }: ApplianceIconProps) {
  const { glyph, tint } = ICONS[slug];
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: radius.lg,
          backgroundColor: background ?? color.surface.subtle,
          borderColor: color.border.default,
        },
      ]}
    >
      <View
        style={[
          styles.glyphWrap,
          { backgroundColor: tint },
        ]}
      >
        <Text style={[styles.glyph, { color: color.surface.base }]}>{glyph}</Text>
      </View>
    </View>
  );
}

const ICONS: Record<ApplianceSlug, { glyph: string; tint: string }> = {
  air_conditioner: { glyph: 'م', tint: color.brand.navy },
  refrigerator: { glyph: 'ث', tint: color.text.primary },
  washing_machine: { glyph: 'غ', tint: color.text.secondary },
};

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  glyphWrap: {
    width: '70%',
    height: '70%',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
  },
});
