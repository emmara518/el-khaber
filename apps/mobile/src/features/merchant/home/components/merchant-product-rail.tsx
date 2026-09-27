/**
 * Merchant Home — Recent products rail.
 *
 * A horizontal rail of the merchant's newest REAL products: approved image
 * placeholder (never a fabricated product photo), name, price when present,
 * and the shared product StatusBadge. Metadata is limited to what the
 * product model actually provides — no views, likes, sales or ratings.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { type MerchantProduct } from '../../products/merchant-product-types';

import { BrandImage, Card, StatusBadge, type } from '@/ui';

export function MerchantProductRail({
  products,
  onPressProduct,
}: {
  products: ReadonlyArray<MerchantProduct>;
  onPressProduct: (product: MerchantProduct) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {products.map((product) => (
        <Pressable
          key={product.id}
          accessibilityRole="button"
          accessibilityLabel={`عرض تفاصيل ${product.nameAr}، الحالة: ${product.statusLabelAr}${
            product.priceSar !== null ? `، السعر: ${product.priceSar} جنيه` : ''
          }`}
          onPress={() => onPressProduct(product)}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Card background={color.surface.base} padded style={styles.card}>
            <View
              accessibilityRole="image"
              accessibilityLabel={`رسم توضيحي، ليس صورة المنتج: ${product.nameAr}${
                product.hasImage ? '، صورة المنتج المسجلة غير متاحة للعرض' : ''
              }`}
              style={styles.artStage}
            >
              <BrandImage name="spare-parts" size={72} />
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {product.nameAr}
            </Text>
            {product.priceSar !== null ? (
              <Text style={styles.price}>{formatPriceAr(product.priceSar)}</Text>
            ) : (
              <Text style={styles.noPrice}>السعر غير محدد</Text>
            )}
            <StatusBadge status={product.status} label={product.statusLabelAr} />
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/**
 * Grouped price copy. Grouping uses Latin digits so the numeric run stays
 * bidi-stable beside the Arabic currency word.
 */
export function formatPriceAr(value: number): string {
  return `${new Intl.NumberFormat('en-US').format(value)} جنيه`;
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: 'row',
    direction: 'rtl',
    gap: spacing[3],
    paddingVertical: spacing[1],
  },
  card: { width: 160, gap: spacing[2] },
  artStage: {
    height: 96,
    borderRadius: radius.md,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    ...type.cardTitle,
    fontSize: 14,
    lineHeight: 22,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  price: {
    ...type.number,
    fontSize: 15,
    lineHeight: 22,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  noPrice: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pressed: { opacity: 0.85 },
});
