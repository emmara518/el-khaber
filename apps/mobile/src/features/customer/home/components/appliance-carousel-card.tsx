import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ApplianceIcon, Card } from '../../../../ui';

import type { ApplianceCardItem } from '../data/customer-home-types';

interface ApplianceCarouselCardProps {
  item: ApplianceCardItem;
  onPress?: () => void;
}

const WIDTH = 140;

/**
 * A single appliance card. Mirrors the reference: soft tile, navy
 * badge, Arabic title, technician count, warranty caption.
 */
export function ApplianceCarouselCard({ item, onPress }: ApplianceCarouselCardProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.titleAr}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card
        background={color.surface.base}
        padded
        style={styles.card}
      >
        <ApplianceIcon slug={item.slug} size={64} background={color.surface.subtle} />
        <Text style={styles.title}>{item.titleAr}</Text>
        <Text style={styles.count}>
          {item.availableTechnicians} {item.techniciansAr}
        </Text>
        <Text style={styles.caption}>{item.captionAr}</Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: WIDTH,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    marginTop: spacing[3],
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  count: {
    marginTop: spacing[1],
    color: color.text.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.regular,
  },
  caption: {
    marginTop: spacing[1],
    color: color.text.secondary,
    fontSize: typography.size.caption,
  },
});
