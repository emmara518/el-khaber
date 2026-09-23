import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ApplianceCardItem } from '../data/customer-home-types';

import { BrandImage } from '@/ui/brand-image';
import { applianceBrandAsset } from '@/ui/cinematic';
import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';


interface ApplianceCardProps {
  item: ApplianceCardItem;
  onPress: () => void;
}

/**
 * Common-appliance card. The approved appliance-category WebP leads on a
 * large warm stage (asset-first), with the name, the real technician
 * count, and a clear forward affordance below. Contained, untinted.
 */
export function ApplianceCard({ item, onPress }: ApplianceCardProps) {
  const hasTechnicians = item.availableTechnicians > 0;
  const availability = hasTechnicians
    ? `${String(item.availableTechnicians)} ${item.techniciansAr}`
    : 'لا يوجد فنيون';
  const asset = applianceBrandAsset(item.slug);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.titleAr}، ${availability}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.stage}>
        {asset ? <BrandImage name={asset} size={88} /> : null}
      </View>
      <View style={styles.footer}>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {item.titleAr}
          </Text>
          <Text style={styles.availability} numberOfLines={2}>
            {availability}
          </Text>
        </View>
        <View style={styles.arrow}>
          <Icon name="chevron-left" size={15} color={color.surface.base} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadow.low,
  },
  pressed: {
    opacity: 0.9,
  },
  stage: {
    height: 108,
    backgroundColor: color.brand.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[1],
    padding: spacing[2] + 2,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    ...type.cardTitle,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  availability: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  arrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
