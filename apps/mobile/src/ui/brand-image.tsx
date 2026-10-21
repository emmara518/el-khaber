/**
 * Brand visual primitives — the single way the app renders the approved
 * 512×512 brand WebP system.
 *
 * Rules encoded here (see `.opencode/skills/el-khabir-mobile-ui`):
 * transparent assets are always `contain`, centered, never tinted, never
 * cropped, never stretched, and only sit on a neutral surface.
 */

import { Image, type ImageStyle, type StyleProp } from 'react-native';

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

