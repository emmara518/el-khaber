/**
 * Brand visual primitives — the single way the app renders the approved
 * 512×512 brand WebP system.
 *
 * Rules encoded here (see `.opencode/skills/el-khabir-mobile-ui`):
 * transparent assets are always `contain`, centered, never tinted, never
 * cropped, never stretched, and only sit on a neutral surface.
 */

import { color } from '@khabir/ui-tokens';
import { Image, StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { brandAssets, type BrandAssetName } from './brand-assets';

interface BrandImageProps {
  name: BrandAssetName;
  size: number;
  /**
   * Screen-reader label. Omit for decorative art (default) — the image is
   * then hidden from assistive tech.
   */
  accessibilityLabel?: string;
  style?: StyleProp<ImageStyle>;
}

/** A contained brand WebP at a fixed square box. Decorative by default. */
export function BrandImage({ name, size, accessibilityLabel, style }: BrandImageProps) {
  const labelled = accessibilityLabel !== undefined;
  return (
    <Image
      source={brandAssets[name]}
      accessible={labelled}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={labelled ? 'yes' : 'no'}
      resizeMode="contain"
      style={[{ width: size, height: size }, style]}
    />
  );
}

interface BrandTileProps {
  name: BrandAssetName;
  size?: number;
  /** Fraction of the tile the artwork occupies (padding around it). */
  inset?: number;
  background?: string;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A neutral, softly-rounded tile holding a contained brand asset. Used for
 * category emblems, feature tiles and compact trust marks. The tile never
 * tints the artwork and never fills behind it with navy.
 */
export function BrandTile({
  name,
  size = 64,
  inset = 0.72,
  background,
  bordered = true,
  style,
}: BrandTileProps) {
  const art = Math.round(size * inset);
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: background ?? color.surface.subtle,
          borderWidth: bordered ? 1 : 0,
          borderColor: color.border.default,
        },
        style,
      ]}
    >
      <BrandImage name={name} size={art} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
