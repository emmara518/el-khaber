/**
 * Shared role tab bar (Technician / Merchant).
 *
 * One bottom-navigation visual system for the whole product. The
 * `navy` surface variant matches the Customer tab bar exactly (navy
 * surface, gold active pill, approved brand emblems, navigation type
 * role) so every role reads as ONE EL-KHABIR app. The `light` surface
 * (default) keeps the original shell look for Merchant.
 *
 * Destinations may supply an approved brand emblem (`asset`); when
 * absent the Feather `icon` is used. The active destination is marked
 * by a surface pill AND a heavier label (never colour alone), with a
 * subtle press animation that respects Reduce Motion.
 */

import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BrandImage, type BrandAssetName } from '@/ui';
import { Icon, type IconName } from '@/ui/icon';
import { fontFamily, type } from '@/ui/typography';

export interface ShellTab {
  id: string;
  labelAr: string;
  icon: IconName;
  /** Approved brand emblem; preferred over `icon` when provided. */
  asset?: BrandAssetName;
}

export type RoleTabSurface = 'light' | 'navy';

export function RoleTabBar({
  tabs,
  active,
  onChange,
  surface = 'light',
  style,
}: {
  tabs: ReadonlyArray<ShellTab>;
  active: string;
  onChange: (id: string) => void;
  surface?: RoleTabSurface;
  style?: ViewStyle;
}) {
  const navy = surface === 'navy';
  return (
    <View style={[styles.bar, navy ? styles.barNavy : styles.barLight, style]}>
      {tabs.map((tab) => (
        <RoleTabItem
          key={tab.id}
          tab={tab}
          surface={surface}
          isActive={tab.id === active}
          onPress={() => onChange(tab.id)}
        />
      ))}
    </View>
  );
}

function RoleTabItem({
  tab,
  surface,
  isActive,
  onPress,
}: {
  tab: ShellTab;
  surface: RoleTabSurface;
  isActive: boolean;
  onPress: () => void;
}) {
  const navy = surface === 'navy';
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
      accessibilityLabel={isActive ? `${tab.labelAr}، الصفحة الحالية` : tab.labelAr}
      style={styles.item}
    >
      <Animated.View style={animatedStyle}>
        <View
          style={[
            styles.iconPill,
            navy ? styles.iconPillNavy : styles.iconPillLight,
            isActive && (navy ? styles.iconPillActiveNavy : styles.iconPillActiveLight),
          ]}
        >
          {tab.asset !== undefined ? (
            <BrandImage name={tab.asset} size={28} />
          ) : (
            <Icon
              name={tab.icon}
              size="nav"
              color={navy ? (isActive ? color.brand.navy : color.border.default) : isActive ? color.brand.navy : color.text.secondary}
            />
          )}
        </View>
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          navy
            ? isActive
              ? styles.labelActiveNavy
              : styles.labelInactiveNavy
            : isActive
              ? styles.labelActiveLight
              : styles.labelInactiveLight,
        ]}
      >
        {tab.labelAr}
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
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  barNavy: {
    backgroundColor: color.brand.navy,
    ...shadow.high,
  },
  barLight: {
    backgroundColor: color.surface.base,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
    ...shadow.medium,
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  iconPillNavy: {
    width: 56,
    height: 36,
  },
  iconPillLight: {
    width: 52,
    height: 32,
  },
  iconPillActiveNavy: {
    backgroundColor: color.brand.gold,
  },
  iconPillActiveLight: {
    backgroundColor: color.brand.goldSoft,
  },
  label: {
    ...type.navigation,
    writingDirection: 'rtl',
  },
  labelActiveNavy: {
    color: color.surface.base,
    fontFamily: fontFamily.bold,
  },
  labelInactiveNavy: {
    color: color.border.default,
    fontFamily: fontFamily.regular,
  },
  labelActiveLight: {
    color: color.brand.navy,
    fontFamily: fontFamily.bold,
  },
  labelInactiveLight: {
    color: color.text.secondary,
    fontFamily: fontFamily.regular,
  },
});
