/**
 * Full-width technician result card (Batch C).
 *
 * Distinct from the Home carousel card (fixed 116px teaser): this
 * card carries verification, experience, service area, availability,
 * and the profile CTA. Built from `Avatar`, `RatingStars`, and
 * `VerificationBadge` — no duplicated primitives.
 */

import { color, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { VerificationBadge } from './verification-badge';

import type { Technician } from '../technician-types';

import { Avatar, Card, RatingStars } from '@/ui';


export function TechnicianResultCard({
  technician,
  onPress,
}: {
  technician: Technician;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`عرض ملف ${technician.nameAr}، ${technician.specialtiesAr.join('، ')}، التقييم ${technician.rating} من ٥${technician.verified ? '، موثّق من الخبير' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card background={color.surface.base} padded style={styles.card}>
        <View style={styles.row}>
          <Avatar
            initials={technician.initialsAr}
            size={60}
            statusDot
            statusColor={technician.available ? color.success.DEFAULT : color.text.secondary}
            accessibilityLabel={`${technician.nameAr}${technician.available ? '، متاح' : '، مشغول حاليًا'}`}
          />
          <View style={styles.middle}>
            <Text style={styles.name}>{technician.nameAr}</Text>
            <RatingStars rating={technician.rating} reviewCount={technician.reviewCount} size="sm" />
            <Text style={styles.meta}>
              {technician.specialtiesAr.join(' · ')}
            </Text>
          </View>
          <Text style={styles.chevron}>‹</Text>
        </View>
        <View style={styles.footer}>
          <VerificationBadge verified={technician.verified} />
          <Text style={styles.area}>
            📍 {technician.areasAr.join('، ')}
          </Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.experience}>🛠️ {technician.experienceAr}</Text>
          <Text
            style={[
              styles.availability,
              technician.available ? styles.available : styles.busy,
            ]}
          >
            {technician.available ? '●' : '○'} {technician.availabilityLabelAr}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.8,
  },
  card: {
    gap: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  middle: {
    flex: 1,
    gap: spacing[1],
  },
  name: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  meta: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    textAlign: 'right',
  },
  chevron: {
    color: color.text.secondary,
    fontSize: 26,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  area: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    flex: 1,
    textAlign: 'left',
  },
  experience: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
  },
  availability: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
  available: {
    color: color.success.DEFAULT,
  },
  busy: {
    color: color.text.secondary,
  },
});
