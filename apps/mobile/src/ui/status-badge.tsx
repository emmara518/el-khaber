import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import type { OrderStatus } from '../features/customer/home/data/customer-home-types';
import type { CustomerRequestStatus } from '../features/customer/requests/customer-requests-types';
import type { MerchantProductStatus } from '../features/merchant/products/merchant-product-types';

interface StatusBadgeProps {
  status: OrderStatus | CustomerRequestStatus | MerchantProductStatus;
  label: string;
}

/**
 * Pill-shaped status badge shown on the "طلباتك الحالية" card, the
 * Customer Requests screen, and Merchant product cards. Uses the
 * semantic color tokens (success / brand / warning / error /
 * text.secondary) so a future reorder of the palette does not
 * require touching this component.
 *
 * Lifecycle tones follow docs/07_API.md §22 + docs/04_UI_UX.md §20:
 * pending (gold tint), accepted/on_the_way (navy/gold), in_progress
 * (success), completed (muted), cancelled (error tint). Product
 * statuses (docs/06 §21): active (success), suspended (muted).
 */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const { background, foreground } = TONE[status];
  return (
    <View
      style={[styles.pill, { backgroundColor: background }]}
      accessible
      accessibilityLabel={label}
    >
      <Text style={[styles.text, { color: foreground }]}>{label}</Text>
    </View>
  );
}

const TONE: Record<
  OrderStatus | CustomerRequestStatus | MerchantProductStatus,
  { background: string; foreground: string }
> = {
  pending: { background: color.brand.goldSoft, foreground: color.warning.DEFAULT },
  accepted: { background: color.brand.navy, foreground: color.surface.base },
  on_the_way: { background: color.brand.gold, foreground: color.brand.navy },
  in_progress: { background: color.success.soft, foreground: color.success.DEFAULT },
  scheduled: { background: color.brand.goldSoft, foreground: color.brand.navy },
  completed: { background: color.surface.subtle, foreground: color.text.secondary },
  cancelled: { background: color.error.soft, foreground: color.error.DEFAULT },
  active: { background: color.success.soft, foreground: color.success.DEFAULT },
  suspended: { background: color.surface.subtle, foreground: color.text.secondary },
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
  },
  text: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
});
