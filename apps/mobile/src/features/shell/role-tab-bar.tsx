/**
 * Shared role tab bar (Customer / Technician / Merchant).
 *
 * One bottom-navigation visual system for the whole product: a deep navy
 * surface, a gold active pill, approved brand emblems, and one navigation
 * type role — so every role reads as ONE EL-KHABIR app.
 *
 * Destinations may supply an approved brand emblem (`asset`); when absent
 * the Feather `icon` is used. The active destination is marked by a surface
 * pill AND a heavier label (never colour alone), with a subtle press
 * animation that respects Reduce Motion.
 *
 * The component is presentational only: tabs, the active id and the
 * navigation callback come from each role's own configuration. No role
 * conditionals live here.
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

export function RoleTabBar({
  tabs,
  active,
  onChange,
  style,
}: {
  tabs: ReadonlyArray<ShellTab>;
  active: string | null;
  onChange: (id: string) => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.bar, style]}>
      {tabs.map((tab) => (
        <RoleTabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === active}
          onPress={() => onChange(tab.id)}
        />
      ))}
    </View>
  );
}

function RoleTabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: ShellTab;
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
      accessibilityLabel={isActive ? `${tab.labelAr}، الصفحة الحالية` : tab.labelAr}
      style={styles.item}
    >
      <Animated.View style={animatedStyle}>
        <View style={[styles.iconPill, isActive && styles.iconPillActive]}>
          {tab.asset !== undefined ? (
            <BrandImage name={tab.asset} size={28} />
          ) : (
            <Icon
              name={tab.icon}
              size="nav"
              color={isActive ? color.brand.navy : color.border.default}
            />
          )}
        </View>
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}
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
    width: 52,
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
    fontSize: 10,
    lineHeight: 14,
    width: '100%',
    textAlign: 'center',
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
