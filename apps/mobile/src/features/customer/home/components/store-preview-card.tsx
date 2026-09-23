import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandImage } from '@/ui/brand-image';
import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';

interface StorePreviewCardProps {
  onPressStore: () => void;
}

/**
 * El-Khabir Store — a major, asset-led card on a warm cream surface. The
 * approved `spare-parts` asset leads on the right; the title, copy and
 * navy CTA follow. There is no customer-facing catalog API/route yet
 * (`GET /merchant/products` is merchant-owned), so the card stays clearly
 * "قريبًا". No invented products, prices, merchants, images or checkout.
 */
export function StorePreviewCard({ onPressStore }: StorePreviewCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>قريبًا</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.stage} accessibilityRole="image" accessibilityLabel="متجر الخبير">
          <BrandImage name="spare-parts" size={150} />
        </View>

        <View style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title}>
            متجر الخبير
          </Text>
          <Text style={styles.body}>قطع ومنتجات تساعدك في صيانة أجهزتك</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="دخول المتجر، قريبًا"
            onPress={onPressStore}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Icon name="chevron-left" size={18} color={color.surface.base} />
            <Text style={styles.ctaText}>دخول المتجر</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.brand.goldSoft,
    borderRadius: radius.xl,
    overflow: 'hidden',
    direction: 'rtl',
    ...shadow.medium,
  },
  badge: {
    position: 'absolute',
    top: spacing[3],
    start: spacing[3],
    zIndex: 2,
    backgroundColor: color.brand.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: 3,
    ...shadow.low,
  },
  badgeText: {
    ...type.caption,
    color: color.brand.navy,
    writingDirection: 'rtl',
  },
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'stretch',
  },
  stage: {
    width: '44%',
    minHeight: 172,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingVertical: spacing[4],
    paddingStart: spacing[4],
    paddingEnd: spacing[2],
    gap: spacing[2],
    justifyContent: 'center',
  },
  title: {
    ...type.h2,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    ...type.body,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    opacity: 0.85,
  },
  cta: {
    marginTop: spacing[1],
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: color.brand.navy,
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
  },
  ctaText: {
    ...type.button,
    color: color.surface.base,
    writingDirection: 'rtl',
  },
  pressed: {
    opacity: 0.88,
  },
});
