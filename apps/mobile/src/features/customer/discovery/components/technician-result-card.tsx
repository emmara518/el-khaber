import { color, radius, spacing } from '@khabir/ui-tokens';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { getTechnicianCardContent } from './technician-result-card-content';
import { VerificationBadge } from './verification-badge';

import type { Technician } from '../technician-types';

import { Avatar } from '@/ui/avatar';
import { Card } from '@/ui/card';
import { applianceSceneAsset } from '@/ui/cinematic';
import { Icon } from '@/ui/icon';
import { RatingStars } from '@/ui/rating-stars';
import { sceneAssets } from '@/ui/scene-assets';
import { type } from '@/ui/typography';

export function TechnicianResultCard({
  technician,
  onPress,
}: {
  technician: Technician;
  onPress: () => void;
}) {
  const content = getTechnicianCardContent(technician);
  const serviceAsset = applianceSceneAsset(technician.appliances[0] ?? '');
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const hasTrust = content.rating !== null || content.verified || content.availability.length > 0;

  function animatePress(pressed: boolean) {
    scale.value = withTiming(pressed ? 0.985 : 1, {
      duration: pressed ? 100 : 150,
      reduceMotion: ReduceMotion.System,
    });
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel={content.accessibilityLabel}
        onPress={onPress}
        onPressIn={() => animatePress(true)}
        onPressOut={() => animatePress(false)}
      >
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Card borderRadius={radius.xl} style={styles.card}>
            <View style={styles.monogramPanel}>
              <Avatar initials={content.initials} size={64} background={color.brand.goldSoft} foreground={color.brand.navy} />
              <View style={styles.visualContext}>
                <Text style={styles.visualLabel}>الخدمات والأجهزة</Text>
                <Text style={styles.visualCaption}>صورة توضيحية للخدمة</Text>
              </View>
              <Image source={sceneAssets[serviceAsset ?? 'technician_profile_services']} accessible={false} resizeMode="contain" style={styles.serviceImage} />
            </View>
            <View style={styles.body}>
              <View style={styles.identity}>
                <Text style={styles.name}>{content.name}</Text>
                {content.specialties.length > 0 ? (
                  <Text style={styles.specialties}>{content.specialties.join(' · ')}</Text>
                ) : null}
              </View>
              {content.services.length > 0 ? (
                <View style={styles.services}>
                  {content.services.map((service) => (
                    <View key={service} style={styles.serviceTag}>
                      <Text style={styles.serviceText}>{service}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {hasTrust ? (
                <View style={styles.trustStrip}>
                  {content.rating !== null ? (
                    <RatingStars rating={content.rating.value} reviewCount={content.rating.count} />
                  ) : null}
                  {content.verified ? <VerificationBadge verified /> : null}
                  {content.availability.length > 0 ? (
                    <View style={styles.availability}>
                      <Icon name="clock" size={14} color={color.text.secondary} />
                      <Text style={styles.detailText}>{content.availability}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              {content.experience.length > 0 ? (
                <Text style={styles.detailText}>{content.experience}</Text>
              ) : null}
              {content.areas.length > 0 ? (
                <View style={styles.areaRow}>
                  <Icon name="map-pin" size={14} color={color.text.secondary} />
                  <Text style={[styles.detailText, styles.areaText]}>
                    {content.areas.join('، ')}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.action}>
              <Text style={styles.actionText}>عرض الملف الشخصي</Text>
              <View style={styles.actionIcon}>
                <Icon name="arrow-left" size={20} color={color.brand.navy} />
              </View>
            </View>
          </Card>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    direction: 'rtl',
  },
  monogramPanel: {
    backgroundColor: color.brand.navy,
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  visualContext: { flex: 1, gap: spacing[1] },
  visualLabel: { ...type.bodyMedium, color: color.surface.base, textAlign: 'right', writingDirection: 'rtl' },
  visualCaption: { ...type.caption, color: color.border.default, textAlign: 'right', writingDirection: 'rtl' },
  serviceImage: { width: 72, height: 80, borderRadius: radius.md },
  body: {
    padding: spacing[5],
    gap: spacing[3],
  },
  identity: {
    gap: spacing[1],
  },
  name: {
    ...type.h3,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  specialties: {
    ...type.body,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  services: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  serviceTag: {
    maxWidth: '100%',
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  serviceText: {
    ...type.label,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  trustStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    maxWidth: '100%',
  },
  detailText: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  areaText: {
    flex: 1,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: color.brand.navy,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    gap: spacing[3],
    minHeight: 60,
  },
  actionText: {
    flex: 1,
    ...type.button,
    color: color.surface.base,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actionIcon: {
    backgroundColor: color.brand.goldSoft,
    borderRadius: radius.pill,
    padding: spacing[2],
  },
});
