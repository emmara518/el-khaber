import { color, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

interface RatingStarsProps {
  rating: number;
  reviewCount: number;
  size?: 'sm' | 'md';
  /** Hide the "(count)" suffix (e.g. inside a single review row). */
  showCount?: boolean;
}

/**
 * Gold star + rating + review count. Matches the technician card
 * style in the reference design.
 */
export function RatingStars({ rating, reviewCount, size = 'md', showCount = true }: RatingStarsProps) {
  const fontSize = size === 'sm' ? typography.size.caption : typography.size.body;
  return (
    <View style={styles.row}>
      <Text style={[styles.star, { fontSize, color: color.brand.gold }]}>★</Text>
      <Text style={[styles.rating, { fontSize, color: color.text.primary }]}>
        {rating.toFixed(1)}
      </Text>
      {showCount ? (
        <Text style={[styles.count, { fontSize, color: color.text.secondary }]}>
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
  },
  star: {
    marginEnd: spacing[1],
    fontWeight: typography.weight.bold,
  },
  rating: {
    marginEnd: spacing[1],
    fontWeight: typography.weight.semibold,
  },
  count: {
    fontWeight: typography.weight.regular,
  },
});
