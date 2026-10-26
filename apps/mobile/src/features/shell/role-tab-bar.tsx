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
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { BrandImage, usePressScale, type BrandAssetName } from '@/ui';
import { Icon, type IconName } from '@/ui/icon';
import { CONTENT_MAX_WIDTH } from '@/ui/layout';
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
  const isWeb = Platform.OS === 'web';
  return (
    <View
      role={isWeb ? 'navigation' : undefined}
      aria-label={isWeb ? 'التنقل السفلي' : undefined}
      style={[styles.bar, style]}
    >
      <View style={styles.barInner}>
        {tabs.map((tab) => (
          <RoleTabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === active}
            onPress={() => onChange(tab.id)}
          />
        ))}
      </View>
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
  const scale = usePressScale(0.92);
  const [focused, setFocused] = useState(false);
  const isWeb = Platform.OS === 'web';
  const webKeyboardProps =
    isWeb
      ? {
          onKeyDown: (event: {
            key: string;
            repeat?: boolean;
            preventDefault: () => void;
          }) => {
            if (event.repeat) return;
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
              event.preventDefault();
              onPress();
            }
          },
        }
      : {};
  const focusedStyle =
    isWeb && focused
      ? ({
          outlineStyle: 'solid',
          outlineWidth: 2,
          outlineColor: color.surface.base,
          outlineOffset: -2,
        } as unknown as ViewStyle)
      : undefined;
  return (
    <Pressable
      {...webKeyboardProps}
      onPress={onPress}
      onPressIn={scale.onPressIn}
      onPressOut={scale.onPressOut}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      accessibilityRole={isWeb ? 'link' : 'tab'}
      accessibilityState={isWeb ? undefined : { selected: isActive }}
      aria-selected={isWeb ? undefined : isActive}
      aria-current={isWeb && isActive ? 'page' : undefined}
      accessibilityLabel={isActive && !isWeb ? `${tab.labelAr}، الصفحة الحالية` : tab.labelAr}
      style={[styles.item, focusedStyle]}
    >
      <Animated.View style={scale.style}>
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
    alignItems: 'center',
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
    paddingHorizontal: spacing[2],
    backgroundColor: color.brand.navy,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    ...shadow.high,
  },
  barInner: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
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
