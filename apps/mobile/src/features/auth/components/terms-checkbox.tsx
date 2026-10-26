/**
 * Terms consent checkbox — a real, accessible control (role `checkbox`
 * with a resolved `checked` state), not a decorative image. Selection is
 * shown structurally (empty box → gold box with a check) and never by
 * colour alone.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import type { ReactNode } from 'react';

import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';

export function TermsCheckbox({
  checked,
  onToggle,
  label,
  prefix,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  prefix: string;
  children: ReactNode;
}) {
  const webKeyboardProps =
    Platform.OS === 'web'
      ? {
          onKeyDown: (event: { key: string; repeat?: boolean; preventDefault: () => void }) => {
            if (event.repeat) return;
            if (event.key === ' ' || event.key === 'Spacebar') {
              event.preventDefault();
              onToggle();
            }
          },
        }
      : {};

  return (
    <View style={styles.row}>
      <Pressable
        {...webKeyboardProps}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        aria-checked={checked}
        accessibilityLabel={label}
        onPress={onToggle}
        style={({ pressed }) => [styles.control, pressed && styles.pressed]}
      >
        <View
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={[styles.box, checked && styles.boxChecked]}
        >
          {checked ? <Icon name="check" size={16} color={color.brand.navy} /> : null}
        </View>
        <Text style={styles.prefix}>{prefix}</Text>
      </Pressable>
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

export function ConsentLink({
  label,
  onPress,
  style,
  children,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
}) {
  const webKeyboardProps =
    Platform.OS === 'web'
      ? {
          onKeyDown: (event: { key: string; repeat?: boolean; preventDefault: () => void }) => {
            if (event.repeat) return;
            if (event.key === 'Enter') {
              event.preventDefault();
              onPress();
            }
          },
        }
      : {};

  return (
    <Text
      {...webKeyboardProps}
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={style}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    minHeight: 44,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 44,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: color.brand.navy,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: color.brand.gold,
  },
  prefix: {
    ...type.body,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
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
