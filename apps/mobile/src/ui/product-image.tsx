/**
 * ProductImage — renders the real persisted product `image_url` when present.
 *
 * Truth rules (Phase C / C5):
 *   • a stored URL → render the actual product image (no placeholder lie),
 *   • while it loads → a quiet skeleton (never a false "unavailable" claim),
 *   • if it fails to load → the truthful illustrative placeholder,
 *   • no URL at all → the truthful illustrative placeholder.
 *
 * Shared by the merchant catalog/detail and the public store (customer and
 * technician). The URL is a plain stored string from the product contract
 * (`MerchantProductDto.imageUrl` / `PublicProductDto.imageUrl`) — no signing.
 */

import { color, radius } from '@khabir/ui-tokens';
import { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { productImageDisplay, type ProductImageLoadState } from './product-image-display';
import { ProductImagePlaceholder } from './product-image-placeholder';

export function ProductImage({
  imageUrl,
  nameAr,
  size = 96,
  style,
}: {
  imageUrl: string | null;
  nameAr: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const uri = (imageUrl ?? '').trim();
  const [state, setState] = useState<ProductImageLoadState>('loading');
  const display = productImageDisplay(imageUrl, state);

  if (display === 'placeholder') {
    return (
      <ProductImagePlaceholder
        nameAr={nameAr}
        size={size}
        hasImage={uri.length > 0}
        style={style}
      />
    );
  }

  return (
    <View style={[styles.frame, { width: size, height: size }, style]}>
      {display === 'skeleton' ? <View style={styles.skeleton} /> : null}
      <Image
        source={{ uri }}
        accessibilityRole="image"
        accessibilityLabel={`صورة المنتج: ${nameAr}`}
        onLoad={() => setState('loaded')}
        onError={() => setState('error')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.surface.subtle,
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: color.surface.subtle,
  },
});
