import { color, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from './icon';
import { fontFamily } from './typography';

interface RatingStarsProps {
  rating: number;
  reviewCount: number;
  size?: 'sm' | 'md';
  /** Hide the "(count)" suffix (e.g. inside a single review row). */
  showCount?: boolean;
  /** Render for a dark (navy) surface: light value/count colours. */
  onDark?: boolean;
}

/**
 * Gold star + rating + review count. Matches the technician card
 * style in the reference design.
 */
export function RatingStars({
  rating,
  reviewCount,
  size = 'md',
  showCount = true,
  onDark = false,
}: RatingStarsProps) {
  const fontSize = size === 'sm' ? typography.size.caption : typography.size.body;
  const valueColor = onDark ? color.surface.base : color.text.primary;
  const countColor = onDark ? color.brand.goldSoft : color.text.secondary;
  const spoken = showCount
    ? `التقييم ${rating.toFixed(1)} من 5، ${reviewCount} مراجعة`
    : `التقييم ${rating.toFixed(1)} من 5`;
  return (
    <View accessibilityRole="text" accessibilityLabel={spoken} style={styles.row}>
      <Icon name="star" size={fontSize === typography.size.caption ? 13 : 15} color={color.brand.gold} accessible={false} />
      <Text style={[styles.rating, { fontSize, color: valueColor }]}>
        {rating.toFixed(1)}
      </Text>
      {showCount ? (
        <Text style={[styles.count, { fontSize, color: countColor }]}>
          ({reviewCount})
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  rating: {
    fontFamily: fontFamily.semibold,
  },
  count: {
    fontFamily: fontFamily.regular,
  },
});
