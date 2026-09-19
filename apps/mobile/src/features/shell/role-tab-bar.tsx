/**
 * Generic role tab bar.
 *
 * Same visual system as `CustomerTabBar` (white bar, gray icons,
 * gold active) so Customer / Technician / Merchant read as ONE
 * product. Technician and Merchant shells consume this generic bar
 * with their own tab descriptors.
 */

import { color, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

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
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={isActive ? `${tab.labelAr}، الصفحة الحالية` : tab.labelAr}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Icon
              name={tab.icon}
              size="nav"
              color={isActive ? color.brand.gold : color.text.secondary}
            />
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? color.brand.gold : color.text.secondary,
                  fontWeight: isActive ? typography.weight.semibold : typography.weight.regular,
                },
              ]}
            >
              {tab.labelAr}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: spacing[2] + 2,
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[2],
    backgroundColor: color.surface.base,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[1],
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: typography.size.caption - 1,
  },
});
