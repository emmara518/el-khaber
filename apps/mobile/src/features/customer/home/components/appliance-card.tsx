import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { availabilityLineAr, type ApplianceCardItem } from '../data/customer-home-types';

import { BrandImage } from '@/ui/brand-image';
import { applianceBrandAsset } from '@/ui/cinematic';
import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';


interface ApplianceCardProps {
  item: ApplianceCardItem;
  onPress: () => void;
  /** Optional information action (e.g. technical data dialog). */
  onPressInfo?: () => void;
}

/**
 * Common-appliance card. The approved appliance-category WebP leads on a
 * large warm stage (asset-first), with the name, the real technician
 * count, and a clear forward affordance below. Contained, untinted.
 */
export function ApplianceCard({ item, onPress, onPressInfo }: ApplianceCardProps) {
  const availability = availabilityLineAr(item.availableTechnicians, item.techniciansAr);
  const asset = applianceBrandAsset(item.slug);
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={availability !== null ? `${item.titleAr}، ${availability}` : item.titleAr}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View style={styles.stage}>
          {asset ? <BrandImage name={asset} size={88} /> : null}
        </View>
        <View style={styles.footer}>
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>
              {item.titleAr}
            </Text>
            {availability !== null ? (
              <Text style={styles.availability} numberOfLines={2}>
                {availability}
              </Text>
            ) : null}
          </View>
          <View style={styles.arrow}>
            <Icon name="chevron-left" size={15} color={color.surface.base} />
          </View>
        </View>
      </Pressable>
      {onPressInfo !== undefined ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`البيانات الفنية: ${item.titleAr}`}
          onPress={onPressInfo}
          hitSlop={12}
          style={({ pressed }) => [styles.infoBtn, pressed && styles.pressed]}
        >
          <Icon name="info" size={16} color={color.text.secondary} />
        </Pressable>
      ) : null}
    </View>
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
  main: {
    flex: 1,
    minWidth: 0,
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
  infoBtn: {
    position: 'absolute',
    top: 0,
    end: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
