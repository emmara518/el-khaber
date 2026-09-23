/**
 * Generic role tab bar.
 *
 * Same premium surface and active treatment as `CustomerTabBar` so
 * Customer / Technician / Merchant read as ONE product: a pill indicator
 * plus a heavier label mark the active tab (never colour alone), with a
 * subtle press animation. Feather owns the navigation chrome.
 */

import { color, radius, shadow, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon, type IconName } from '@/ui/icon';

export interface ShellTab {
  id: string;
  labelAr: string;
  icon: IconName;
}

export function RoleTabBar({
  tabs,
  active,
  onChange,
  style,
}: {
  tabs: ReadonlyArray<ShellTab>;
  active: string;
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
          <Icon
            name={tab.icon}
            size="nav"
            color={isActive ? color.brand.navy : color.text.secondary}
          />
        </View>
      </Animated.View>
      <Text numberOfLines={1} style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
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
    backgroundColor: color.surface.base,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
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
    width: 52,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: color.brand.goldSoft,
  },
  label: {
    fontSize: typography.size.caption - 1,
    writingDirection: 'rtl',
  },
  labelActive: {
    color: color.brand.navy,
    fontWeight: typography.weight.bold,
  },
  labelInactive: {
    color: color.text.secondary,
    fontWeight: typography.weight.regular,
  },
});
