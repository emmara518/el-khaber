import { color, radius, typography } from '@khabir/ui-tokens';
import { Image, StyleSheet, Text, View } from 'react-native';

import { sceneAssets } from '@/ui/scene-assets';

export function ProductImagePlaceholder({ nameAr, size = 96, hasImage }: { nameAr: string; size?: number; hasImage: boolean }) {
  return (
    <View accessibilityRole="image" accessibilityLabel={`رسم توضيحي، ليس صورة المنتج: ${nameAr}${hasImage ? '، صورة المنتج المسجلة غير متاحة للعرض' : ''}`} style={styles.tile}>
      <Image source={sceneAssets.merchant_products} accessible={false} resizeMode="contain" style={{ width: size, height: size }} />
      <Text style={styles.label}>رسم توضيحي</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { backgroundColor: color.surface.subtle, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 4 },
  label: { color: color.text.secondary, fontSize: typography.size.caption, lineHeight: 22, textAlign: 'center', writingDirection: 'rtl' },
});
