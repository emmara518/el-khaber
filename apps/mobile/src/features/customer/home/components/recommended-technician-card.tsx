import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { VerificationBadge } from '../../discovery/components/verification-badge';

import type { TechnicianCardItem } from '../data/customer-home-types';

import { Avatar } from '@/ui/avatar';
import { Card } from '@/ui/card';
import { Icon, type IconName } from '@/ui/icon';
import { RatingStars } from '@/ui/rating-stars';
import { type } from '@/ui/typography';

interface RecommendedTechnicianCardProps {
  technician: TechnicianCardItem;
  onPress: () => void;
}

/** Availability is conveyed by icon + text, never colour alone.
 * Order matters: "غير متاح" also contains "متاح". */
function availabilityIcon(label: string): IconName {
  if (label.includes('غير')) return 'slash';
  if (label.includes('مشغول')) return 'clock';
  if (label.includes('متاح')) return 'check-circle';
  return 'circle';
}

/**
 * Recommended-technician card. Real fields only: identity (initials),
 * verification, specialty, rating, review count, and availability.
 * Location is intentionally omitted — the public API does not expose
 * technician areas (honest gap).
 */
export function RecommendedTechnicianCard({ technician, onPress }: RecommendedTechnicianCardProps) {
  return (
    <Card background={color.surface.base} padded style={styles.card}>
      <View style={styles.row}>
        <Avatar
          initials={technician.initialsAr}
          size={56}
          background={color.brand.navy}
          foreground={color.surface.base}
          accessibilityLabel={technician.nameAr}
        />
        <View style={styles.copy}>
          <Text style={styles.name} numberOfLines={1}>
            {technician.nameAr}
          </Text>
          {technician.verified ? <VerificationBadge verified /> : null}
          {technician.specialtyAr.length > 0 ? (
            <Text style={styles.specialty} numberOfLines={1}>
              {technician.specialtyAr}
            </Text>
          ) : null}
          <View style={styles.metaRow}>
            {technician.reviewCount > 0 ? (
              <RatingStars rating={technician.rating} reviewCount={technician.reviewCount} size="sm" />
            ) : null}
            {technician.availabilityAr.length > 0 ? (
              <View style={styles.availability}>
                <Icon name={availabilityIcon(technician.availabilityAr)} size={14} color={color.text.secondary} />
                <Text style={styles.availabilityText}>{technician.availabilityAr}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`عرض ملف ${technician.nameAr}`}
        onPress={onPress}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaText}>عرض الملف الشخصي</Text>
        <Icon name="chevron-left" size={16} color={color.brand.navy} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    gap: spacing[3],
    direction: 'rtl',
  },
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[3],
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  name: {
    ...type.cardTitle,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  specialty: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  metaRow: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  availability: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[1],
  },
  availabilityText: {
    ...type.caption,
    color: color.text.secondary,
    writingDirection: 'rtl',
  },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[1],
    minHeight: 40,
    paddingHorizontal: spacing[4],
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border.default,
  },
  pressed: {
    opacity: 0.8,
  },
  ctaText: {
    ...type.label,
    color: color.brand.navy,
    writingDirection: 'rtl',
  },
});
