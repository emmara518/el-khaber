import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Avatar, Card, RatingStars } from '../../../../ui';

import type { TechnicianCardItem } from '../data/customer-home-types';

interface TechnicianCarouselCardProps {
  technician: TechnicianCardItem;
  onPress?: () => void;
}

const WIDTH = 116;

/**
 * Technician card for the "فنيون مقترحون لك" carousel. Mirrors the
 * reference: avatar (circle with initial), name below, gold star +
 * rating + review count, specialty text.
 */
export function TechnicianCarouselCard({ technician, onPress }: TechnicianCarouselCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${technician.nameAr} - ${technician.specialtyAr}`}
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <Card background={color.surface.base} padded style={styles.card}>
        <Avatar
          initials={technician.initialsAr}
          size={56}
          background={color.brand.navy}
          foreground={color.surface.base}
          accessibilityLabel={technician.nameAr}
        />
        <Text style={styles.name} numberOfLines={1}>
          {technician.nameAr}
        </Text>
        <RatingStars
          rating={technician.rating}
          reviewCount={technician.reviewCount}
          size="sm"
        />
        <Text style={styles.specialty} numberOfLines={1}>
          {technician.specialtyAr}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: WIDTH,
  },
  pressed: {
    opacity: 0.75,
  },
  card: {
    width: WIDTH,
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  name: {
    marginTop: spacing[2],
    color: color.text.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  specialty: {
    marginTop: spacing[1],
    color: color.text.secondary,
    fontSize: typography.size.caption,
    textAlign: 'center',
  },
});
