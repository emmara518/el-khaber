/**
 * Generic role tab bar.
 *
 * Same visual system as `CustomerTabBar` (white bar, gray icons,
 * gold active) so Customer / Technician / Merchant read as ONE
 * product. Customer keeps its own existing component untouched;
 * Technician and Merchant shells consume this generic bar with
 * their own tab descriptors.
 */

import { color, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

export interface ShellTab {
  id: string;
  labelAr: string;
  icon: string;
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
            <Text
              style={[styles.icon, { color: isActive ? color.brand.gold : color.text.secondary }]}
            >
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? color.brand.gold : color.text.secondary,
                  fontWeight: isActive ? typography.weight.bold : typography.weight.regular,
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
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[2],
    backgroundColor: color.surface.base,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 20,
    lineHeight: 22,
  },
  label: {
    fontSize: typography.size.caption,
    marginTop: spacing[1],
  },
});
