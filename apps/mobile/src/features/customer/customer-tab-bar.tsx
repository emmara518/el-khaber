import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import type { BrandAssetName } from '@/ui/brand-assets';

import { useI18n, type TranslationKey } from '@/i18n/use-i18n';
import { BrandImage } from '@/ui/brand-image';
import { fontFamily, type } from '@/ui/typography';


export type CustomerTabId = 'home' | 'requests' | 'maintenance' | 'messages' | 'profile';

interface CustomerTabBarProps {
  active: CustomerTabId;
  onChange: (id: CustomerTabId) => void;
  style?: ViewStyle;
}

interface TabDescriptor {
  id: CustomerTabId;
  labelKey: TranslationKey;
  /** Approved local asset for the destination (no tinting, contain). */
  asset: BrandAssetName;
}

/**
 * Only destinations that actually exist in the customer route group, each
 * mapped to its semantically matching approved brand asset:
 * home → `home`, requests → `my-requests`, maintenance → `maintenance`,
 * messages → `messages`, profile → `profile`.
 */
const TABS: ReadonlyArray<TabDescriptor> = [
  { id: 'home', labelKey: 'tab.home', asset: 'home' },
  { id: 'requests', labelKey: 'tab.requests', asset: 'my-requests' },
  { id: 'maintenance', labelKey: 'tab.maintenance', asset: 'maintenance' },
  { id: 'messages', labelKey: 'tab.messages', asset: 'messages' },
  { id: 'profile', labelKey: 'tab.profile', asset: 'profile' },
];

/**
 * Customer bottom navigation — a first-class, premium component on a deep
 * navy surface. The active destination is marked by a gold surface pill
 * *and* a heavier white label (never colour alone). Approved 3D brand
 * assets render `contain`, untinted, at a strong optical size.
 */
export function CustomerTabBar({ active, onChange, style }: CustomerTabBarProps) {
  const { t } = useI18n();
  return (
    <View style={[styles.bar, style]}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const label = t(tab.labelKey);
        return (
          <TabItem
            key={tab.id}
            asset={tab.asset}
            label={label}
            isActive={isActive}
            onPress={() => onChange(tab.id)}
          />
        );
      })}
    </View>
  );
}

function TabItem({
  asset,
  label,
  isActive,
  onPress,
}: {
  asset: BrandAssetName;
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const animate = (pressed: boolean) => {
    scale.value = withTiming(pressed ? 0.92 : 1, {
      duration: pressed ? 100 : 160,
      reduceMotion: ReduceMotion.System,
    });
  };
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animate(true)}
      onPressOut={() => animate(false)}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={isActive ? `${label}، الصفحة الحالية` : label}
      style={styles.item}
    >
      <Animated.View style={animatedStyle}>
        <View style={[styles.iconPill, isActive && styles.iconPillActive]}>
          <BrandImage name={asset} size={28} />
        </View>
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    direction: 'rtl',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[2],
    backgroundColor: color.brand.navy,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.high,
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
    minHeight: 56,
    justifyContent: 'center',
  },
  iconPill: {
    width: 56,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: color.brand.gold,
  },
  label: {
    ...type.navigation,
    writingDirection: 'rtl',
  },
  labelActive: {
    color: color.surface.base,
    fontFamily: fontFamily.bold,
  },
  labelInactive: {
    color: color.border.default,
    fontFamily: fontFamily.regular,
  },
});
