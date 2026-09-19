import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';

import type { QuickServiceItem } from '../features/customer/home/data/customer-home-types';

interface QuickServiceIconProps {
  item: QuickServiceItem;
  background?: string;
  foreground?: string;
  size?: number;
  style?: ViewStyle;
}

/**
 * Square tile with a centered vector icon and a label below. Matches
 * the "خدمات سريعة" row in the reference design.
 */
export function QuickServiceIcon({
  item,
  background,
  foreground,
  size = 56,
  style,
}: QuickServiceIconProps) {
  const ICONS: Record<QuickServiceItem['icon'], IconName> = {
    wrench: 'tool',
    search: 'search',
    clipboard: 'clipboard',
    package: 'package',
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
        <Icon
          name={ICONS[item.icon]}
          size={Math.round(size * 0.42)}
          color={foreground ?? color.surface.base}
        />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {item.titleAr}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    width: 80,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: spacing[2],
    color: color.text.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
});
