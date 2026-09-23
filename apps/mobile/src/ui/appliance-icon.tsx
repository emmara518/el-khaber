import { color } from '@khabir/ui-tokens';
import { Image, StyleSheet, View } from 'react-native';

import { brandAssets, type BrandAssetName } from './brand-assets';

import type { ApplianceSlug } from '../features/customer/home/data/customer-home-types';

interface ApplianceIconProps {
  slug: ApplianceSlug;
  /** Tile background; defaults to surface.subtle. */
  background?: string;
  size?: number;
}

/**
 * Appliance category emblem — the approved 512×512 brand WebP rendered
 * `contain` inside a neutral tile. No tint, no crop, no cover: the
 * transparent asset keeps its authored proportions on every card.
 *
 * The tile keeps the app's subtle surface + hairline border so the icon
 * stays legible on both light and navy cards.
 */
const BRAND_BY_SLUG: Record<ApplianceSlug, BrandAssetName> = {
  air_conditioner: 'air-conditioner',
  refrigerator: 'refrigerator',
  washing_machine: 'washing-machine',
};

export function ApplianceIcon({ slug, background, size = 64 }: ApplianceIconProps) {
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
      <Image
        source={brandAssets[BRAND_BY_SLUG[slug]]}
        accessible={false}
        importantForAccessibility="no"
        resizeMode="contain"
        style={{ width: size * 0.72, height: size * 0.72 }}
      />
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
