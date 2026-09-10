/**
 * Product image placeholder — deterministic local tile (M-C
 * display-only; no picker/upload/external URLs). Appliance letter
 * on an off-white tile with the product accessible label.
 */

import { color, radius, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

export function ProductImagePlaceholder({
  nameAr,
  size = 64,
  hasImage,
}: {
  nameAr: string;
  size?: number;
  hasImage: boolean;
}) {
  return (
    <View
      accessibilityRole={hasImage ? 'image' : 'text'}
      accessibilityLabel={hasImage ? `صورة المنتج: ${nameAr}` : `لا توجد صورة للمنتج: ${nameAr}`}
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: radius.md,
        },
      ]}
    >
      <Text style={[styles.glyph, { fontSize: size * 0.34 }]}>{nameAr.slice(0, 1)}</Text>
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
  glyph: {
    color: color.text.secondary,
    fontWeight: typography.weight.bold,
  },
});
