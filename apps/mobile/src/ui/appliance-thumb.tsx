/**
 * ApplianceThumb — a neutral tile holding the approved appliance-category
 * asset for a canonical category slug. Shared by every role's request /
 * service cards. Falls back to a tool glyph when the slug is unknown.
 */

import { color } from '@khabir/ui-tokens';
import { StyleSheet, View } from 'react-native';

import { BrandImage } from './brand-image';
import { applianceBrandAsset } from './cinematic';
import { Icon } from './icon';

interface ApplianceThumbProps {
  slug: string | null;
  size?: number;
}

export function ApplianceThumb({ slug, size = 56 }: ApplianceThumbProps) {
  const asset = slug !== null ? applianceBrandAsset(slug) : undefined;
  return (
    <View
      style={[styles.tile, { width: size, height: size, borderRadius: size / 3 }]}
      accessible={false}
      importantForAccessibility="no"
    >
      {asset ? (
        <BrandImage name={asset} size={Math.round(size * 0.78)} />
      ) : (
        <Icon name="tool" size={Math.round(size * 0.4)} color={color.brand.navy} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
