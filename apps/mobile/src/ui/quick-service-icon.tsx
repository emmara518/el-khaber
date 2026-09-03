import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';

import type { QuickServiceItem } from '../features/customer/home/data/customer-home-types';

interface QuickServiceIconProps {
  item: QuickServiceItem;
  background?: string;
  foreground?: string;
  size?: number;
  style?: ViewStyle;
}

/**
 * Square tile with a centered icon glyph and a label below. Matches
 * the "خدمات سريعة" row in the reference design.
 */
export function QuickServiceIcon({
  item,
  background,
  foreground,
  size = 56,
  style,
}: QuickServiceIconProps) {
  const glyphStyle: TextStyle = {
    color: foreground ?? color.surface.base,
    fontSize: Math.round(size * 0.4),
    fontWeight: typography.weight.bold,
  };
  return (
    <View
      style={[styles.wrap, style]}
      accessible
      accessibilityLabel={item.titleAr}
    >
      <View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderRadius: radius.lg,
            backgroundColor: background ?? color.brand.navy,
          },
        ]}
      >
        <Text style={glyphStyle}>{GLYPHS[item.icon]}</Text>
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {item.titleAr}
      </Text>
    </View>
  );
}

const GLYPHS: Record<QuickServiceItem['icon'], string> = {
  wrench: '🔧',
  search: '🔍',
  clipboard: '📋',
  package: '📦',
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: 80,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontWeight: typography.weight.bold,
  },
  label: {
    marginTop: spacing[2],
    color: color.text.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
});
