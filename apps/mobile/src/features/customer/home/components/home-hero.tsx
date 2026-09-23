import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandImage } from '@/ui/brand-image';
import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';

interface HomeHeroProps {
  titleLine1: string;
  titleLine2: string;
  body: string;
  primaryLabel: string;
  onPressPrimary: () => void;
  secondaryLabel: string;
  onPressSecondary: () => void;
}

/**
 * Home hero — asset-led composition on a warm cream surface. The approved
 * `home-service-illustration` occupies a large, dedicated stage (right of
 * the card) so the visual leads; the headline, supporting copy and gold
 * CTA follow. The transparent asset is `contain`, untinted, and never
 * placed on a navy fill.
 */
export function HomeHero({
  titleLine1,
  titleLine2,
  body,
  primaryLabel,
  onPressPrimary,
  secondaryLabel,
  onPressSecondary,
}: HomeHeroProps) {
  return (
    <View style={styles.card}>
      <View style={styles.badge}>
        <BrandImage name="verified" size={16} />
        <Text style={styles.badgeText}>خدمة منزلية مضمونة</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.assetStage} accessibilityRole="image" accessibilityLabel="فني صيانة منزلي">
          <BrandImage name="home-service-illustration" size={186} />
        </View>

        <View style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title}>
            <Text style={styles.titleNavy}>{titleLine1}</Text>
            {'\n'}
            <Text style={styles.titleGold}>{titleLine2}</Text>
          </Text>
          <Text style={styles.body}>{body}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            onPress={onPressPrimary}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Icon name="chevron-left" size={20} color={color.brand.navy} />
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryLabel}
            onPress={onPressSecondary}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Icon name="chevron-left" size={16} color={color.brand.navy} />
            <Text style={styles.secondaryText}>{secondaryLabel}</Text>
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
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[1] + 2,
    backgroundColor: color.surface.base,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
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
  assetStage: {
    width: '44%',
    minHeight: 244,
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
    ...type.display,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  titleNavy: {
    color: color.brand.navy,
  },
  titleGold: {
    color: color.warning.DEFAULT,
  },
  body: {
    ...type.body,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    opacity: 0.85,
  },
  primary: {
    marginTop: spacing[1],
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: color.brand.gold,
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
  },
  primaryText: {
    ...type.button,
    color: color.brand.navy,
    writingDirection: 'rtl',
  },
  secondary: {
    minHeight: 40,
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  secondaryText: {
    ...type.label,
    color: color.brand.navy,
    writingDirection: 'rtl',
  },
  pressed: {
    opacity: 0.85,
  },
});
