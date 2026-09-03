import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import type { OrderStatus } from '../features/customer/home/data/customer-home-types';

interface StatusBadgeProps {
  status: OrderStatus;
  label: string;
}

/**
 * Pill-shaped status badge shown on the "طلباتك الحالية" card.
 * Uses the semantic color tokens (success / brand / text.secondary)
 * so a future reorder of the palette does not require touching
 * this component.
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

const TONE: Record<OrderStatus, { background: string; foreground: string }> = {
  in_progress: { background: color.success.soft, foreground: color.success.DEFAULT },
  scheduled: { background: color.brand.goldSoft, foreground: color.brand.navy },
  completed: { background: color.surface.subtle, foreground: color.text.secondary },
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
