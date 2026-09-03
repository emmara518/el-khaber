import { color, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useI18n, type TranslationKey } from '@/i18n/use-i18n';

export type CustomerTabId = 'home' | 'requests' | 'maintenance' | 'messages' | 'profile';

interface CustomerTabBarProps {
  active: CustomerTabId;
  onChange: (id: CustomerTabId) => void;
  style?: ViewStyle;
}

interface TabDescriptor {
  id: CustomerTabId;
  labelKey: TranslationKey;
  icon: string;
}

const TABS: ReadonlyArray<TabDescriptor> = [
  { id: 'home', labelKey: 'tab.home', icon: '🏠' },
  { id: 'requests', labelKey: 'tab.requests', icon: '📋' },
  { id: 'maintenance', labelKey: 'tab.maintenance', icon: '🛠️' },
  { id: 'messages', labelKey: 'tab.messages', icon: '💬' },
  { id: 'profile', labelKey: 'tab.profile', icon: '👤' },
];

/**
 * Customer bottom tab bar. Five destinations. The active tab uses
 * the brand gold. Matches the reference design (الرئيسية highlighted
 * in gold; the others in surface.base on the subtle background).
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
            accessibilityLabel={t(tab.labelKey)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <Text
              style={[
                styles.icon,
                { color: isActive ? color.brand.gold : color.text.secondary },
              ]}
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
