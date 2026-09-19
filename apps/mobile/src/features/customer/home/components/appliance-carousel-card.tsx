/**
 * A single appliance card. Mirrors the reference: soft tile, navy
 * badge, Arabic title, technician count, warranty caption.
 *
 * Honest empty state: when `availableTechnicians` is 0 the card
 * communicates clearly without technical jargon or fabricated
 * availability — the count area simply invites the user to check
 * back later, matching the product's trust-first posture.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApplianceIcon, Card } from '../../../../ui';

import type { ApplianceCardItem } from '../data/customer-home-types';

interface ApplianceCarouselCardProps {
  item: ApplianceCardItem;
  onPress?: () => void;
}

const WIDTH = 140;

export function ApplianceCarouselCard({ item, onPress }: ApplianceCarouselCardProps) {
  const hasTechnicians = item.availableTechnicians > 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={hasTechnicians ? item.titleAr : ' appliance card '}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <View style={styles.container}>
        {hasTechnicians ? (
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
        ) : (
          <View style={styles.emptyCard}>
            <ApplianceIcon slug={item.slug} size={64} background={color.surface.subtle} />
            <Text style={styles.emptyTitle}>لا يوجد فنيون حالياً</Text>
            <Text style={styles.emptyMessage}>يمكنك المحاولة لاحقاً</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: WIDTH,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  card: {
    width: WIDTH,
    borderRadius: radius.lg,
    alignItems: 'flex-start',
    padding: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  emptyCard: {
    width: WIDTH,
    borderRadius: radius.lg,
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: color.surface.base,
  },
  emptyTitle: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  emptyMessage: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  title: {
    marginTop: spacing[3],
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  count: {
    marginTop: spacing[1],
    color: color.text.primary,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.regular,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  caption: {
    marginTop: spacing[1],
    color: color.text.secondary,
    fontSize: typography.size.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});