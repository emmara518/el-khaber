import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import type { BrandAssetName } from '@/ui/brand-assets';

import { BrandImage } from '@/ui/brand-image';
import { type } from '@/ui/typography';


interface TrustItem {
  asset: BrandAssetName;
  title: string;
  subtitle: string;
}

/** Restrained, product-supported claims only — no exaggerated promises. */
const ITEMS: ReadonlyArray<TrustItem> = [
  { asset: 'certified-technician', title: 'فنيين معتمدين', subtitle: 'خبرة موثوقة' },
  { asset: 'top-rated', title: 'تقييمات حقيقية', subtitle: 'من عملاء فعليين' },
  { asset: 'verified', title: 'خدمة موثوقة', subtitle: 'بمعايير واضحة' },
  { asset: 'support', title: 'دعم ومتابعة', subtitle: 'معك دائمًا' },
];

/**
 * Trust block. Four compact cards, each led by an approved trust asset so
 * the reassurance is recognised visually. Assets are contained and never
 * tinted; no emoji, no claims the product cannot support.
 */
export function TrustSection() {
  return (
    <View style={styles.row}>
      {ITEMS.map((item) => (
        <View key={item.title} style={styles.card} accessible accessibilityLabel={`${item.title}، ${item.subtitle}`}>
          <BrandImage name={item.asset} size={44} />
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    gap: spacing[2],
  },
  card: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    ...shadow.low,
  },
  title: {
    ...type.label,
    color: color.brand.navy,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  subtitle: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
