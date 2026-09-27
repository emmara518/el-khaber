/**
 * Terms consent checkbox — a real, accessible control (role `checkbox`
 * with a resolved `checked` state), not a decorative image. Selection is
 * shown structurally (empty box → gold box with a check) and never by
 * colour alone.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ReactNode } from 'react';

import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';

export function TermsCheckbox({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel="الموافقة على شروط الاستخدام وسياسة الخصوصية"
      onPress={onToggle}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.box, checked && styles.boxChecked]}
      >
        {checked ? <Icon name="check" size={16} color={color.brand.navy} /> : null}
      </View>
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 44,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    borderColor: color.brand.gold,
    backgroundColor: color.brand.gold,
  },
  label: {
    flex: 1,
    ...type.body,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  pressed: {
    opacity: 0.8,
  },
});
