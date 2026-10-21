import { color, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { StoreProduct } from '../store-types';

import { Card, Icon, ProductImage, type } from '@/ui';
/** One publicly readable product in the store list. Real data only. */
export function StoreProductCard({
  product,
  onPress,
}: {
  product: StoreProduct;
  onPress: () => void;
}) {
  const priceAr = product.price !== null ? `${product.price} جنيه` : 'السعر غير محدد';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`عرض ${product.nameAr}، ${priceAr}${
        product.merchantNameAr !== null ? `، من ${product.merchantNameAr}` : ''
      }`}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card background={color.surface.base} padded style={styles.card}>
        <View style={styles.row}>
          <ProductImage imageUrl={product.imageUrl} nameAr={product.nameAr} size={72} />
          <View style={styles.middle}>
            <Text style={styles.name} numberOfLines={2}>
              {product.nameAr}
            </Text>
            {product.descriptionAr !== null && product.descriptionAr.trim().length > 0 ? (
              <Text style={styles.description} numberOfLines={2}>
                {product.descriptionAr}
              </Text>
            ) : null}
            {product.merchantNameAr !== null && product.merchantNameAr.trim().length > 0 ? (
              <Text style={styles.merchant} numberOfLines={1}>
                {product.merchantNameAr}
              </Text>
            ) : null}
            {product.price !== null ? (
              <Text style={styles.price}>{priceAr}</Text>
            ) : (
              <Text style={styles.noPrice}>{priceAr}</Text>
            )}
          </View>
          <Icon name="chevron-left" size={20} color={color.brand.navy} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing[2] },
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[3],
  },
  middle: { flex: 1, minWidth: 0, gap: spacing[1] },
  name: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  description: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  merchant: { ...type.caption, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  price: { ...type.bodyMedium, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  noPrice: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  pressed: { opacity: 0.85 },
});
