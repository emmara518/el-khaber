import { color, radius } from '@khabir/ui-tokens';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandImage } from './brand-image';
import { type } from './typography';

export function ProductImagePlaceholder({
  nameAr,
  size = 96,
  hasImage,
  style,
}: {
  nameAr: string;
  size?: number;
  hasImage: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={
        hasImage
          ? `تعذّر عرض صورة المنتج المسجلة: ${nameAr}`
          : `لا توجد صورة للمنتج: ${nameAr}`
      }
      style={[styles.tile, style]}
    >
      <BrandImage name="spare-parts" size={size} />
      <Text style={styles.label}>لا توجد صورة</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: color.surface.subtle,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 4,
  },
  label: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
