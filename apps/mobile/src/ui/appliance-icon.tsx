import { color } from '@khabir/ui-tokens';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from './icon';

import type { ApplianceSlug } from '../features/customer/home/data/customer-home-types';

interface ApplianceIconProps {
  slug: ApplianceSlug;
  /** Card background; defaults to surface.subtle. */
  background?: string;
  size?: number;
}

/**
 * Vector appliance illustration: a soft tile with a navy glyph
 * (droplet for washers, snowflake for fridges, wind for ACs).
 * Consistent stroke and optical weight across the set — no letters,
 * no emoji.
 */
export function ApplianceIcon({ slug, background, size = 64 }: ApplianceIconProps) {
  const ICONS: Record<ApplianceSlug, { icon: IconName; tint: string }> = {
    air_conditioner: { icon: 'wind', tint: color.brand.navy },
    refrigerator: { icon: 'thermometer', tint: color.brand.navy },
    washing_machine: { icon: 'droplet', tint: color.brand.navy },
  };
  const { icon, tint } = ICONS[slug];
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: background ?? color.surface.subtle,
          borderColor: color.border.default,
        },
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.4)} color={tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
