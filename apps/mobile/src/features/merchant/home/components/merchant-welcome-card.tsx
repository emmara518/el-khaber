/**
 * Merchant Home — Welcome card.
 *
 * The dominant first-screen surface: the approved Merchant-only storefront
 * illustration (`merchant-welcome-store`) beside the store greeting and the
 * single primary action — adding a product. Reuses the shared Card surface,
 * brand-asset renderer and ActionButton language; no Merchant-only visual
 * system is introduced.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton, BrandImage, type } from '@/ui';

export function MerchantWelcomeCard({
  businessNameAr,
  onAddProduct,
}: {
  businessNameAr: string;
  onAddProduct: () => void;
}) {
  const greeting = businessNameAr.trim().length > 0 ? businessNameAr.trim() : 'متجرك';
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.stage}>
          <BrandImage name="merchant-welcome-store" size={132} />
        </View>
        <View style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title}>
            أهلاً بك في متجرك
          </Text>
          <Text style={styles.body} numberOfLines={3}>
            أضف منتجاتك ووسّع وصولها لعملاء وفنيي الخبير.
          </Text>
        </View>
      </View>
      <ActionButton
        label="إضافة منتج"
        icon="plus-circle"
        accessibilityLabel={`إضافة منتج إلى ${greeting}`}
        onPress={onAddProduct}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.brand.goldSoft,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
    direction: 'rtl',
  },
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[3],
  },
  stage: {
    width: 132,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: spacing[1] },
  title: {
    ...type.h2,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    ...type.body,
    color: color.text.primary,
    opacity: 0.85,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
