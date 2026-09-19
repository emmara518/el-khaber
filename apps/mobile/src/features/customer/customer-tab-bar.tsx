import { color, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useI18n, type TranslationKey } from '@/i18n/use-i18n';
import { Icon, type IconName } from '@/ui/icon';

export type CustomerTabId = 'home' | 'requests' | 'maintenance' | 'messages' | 'profile';

interface CustomerTabBarProps {
  active: CustomerTabId;
  onChange: (id: CustomerTabId) => void;
  style?: ViewStyle;
}

interface TabDescriptor {
  id: CustomerTabId;
  labelKey: TranslationKey;
  icon: IconName;
  /** Filled-tile treatment for the active state. */
  activeIcon: IconName;
}

const TABS: ReadonlyArray<TabDescriptor> = [
  { id: 'home', labelKey: 'tab.home', icon: 'home', activeIcon: 'home' },
  { id: 'requests', labelKey: 'tab.requests', icon: 'clipboard', activeIcon: 'clipboard' },
  { id: 'maintenance', labelKey: 'tab.maintenance', icon: 'tool', activeIcon: 'tool' },
  { id: 'messages', labelKey: 'tab.messages', icon: 'message-circle', activeIcon: 'message-circle' },
  { id: 'profile', labelKey: 'tab.profile', icon: 'user', activeIcon: 'user' },
];

/**
 * Customer bottom tab bar. Five destinations. The active tab uses
 * the brand gold with a soft tinted dot anchor; the rest stay in
 * text.secondary. Uniform Feather icons on a 24px grid.
 */
export function CustomerTabBar({ active, onChange, style }: CustomerTabBarProps) {
  const { t } = useI18n();
  return (
    <View style={[styles.bar, style]}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={isActive ? `${t(tab.labelKey)}، الصفحة الحالية` : t(tab.labelKey)}
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
              {t(tab.labelKey)}
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
