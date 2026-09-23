/**
 * SearchField — the shared search surface for the Customer experience.
 *
 * Two modes, one look:
 *   • navigation trigger — pass `onPress` (no `onChangeText`): renders a
 *     pressable surface that opens a real search route.
 *   • live input — pass `value` + `onChangeText`: renders a TextInput.
 *
 * RTL-correct, 56px touch target, token-driven. No local hex values.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewStyle,
} from 'react-native';

import { Icon } from './icon';
import { type } from './typography';

interface SearchFieldProps {
  placeholder: string;
  /** Navigation-trigger mode. */
  onPress?: () => void;
  /** Live-input mode. */
  value?: string;
  onChangeText?: (text: string) => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function SearchField({
  placeholder,
  onPress,
  value,
  onChangeText,
  accessibilityLabel,
  style,
}: SearchFieldProps) {
  const label = accessibilityLabel ?? placeholder;

  const chrome = (inner: React.ReactNode) => (
    <View style={[styles.surface, style]}>
      <View style={styles.lead}>
        <Icon name="search" size={18} color={color.brand.navy} />
      </View>
      {inner}
    </View>
  );

  if (onPress && onChangeText === undefined) {
    return (
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {chrome(
          <>
            <Text style={styles.placeholder} numberOfLines={1}>
              {placeholder}
            </Text>
            <Icon name="chevron-left" size={18} color={color.text.secondary} />
          </>,
        )}
      </Pressable>
    );
  }

  return chrome(
    <TextInput
      accessibilityLabel={label}
      placeholder={placeholder}
      placeholderTextColor={color.text.secondary}
      value={value}
      onChangeText={onChangeText}
      style={styles.input}
      returnKeyType="search"
    />,
  );
}

const styles = StyleSheet.create({
  surface: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[3],
    minHeight: 56,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
  },
  pressed: {
    opacity: 0.85,
  },
  lead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.brand.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    minWidth: 0,
    ...type.body,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  input: {
    flex: 1,
    minWidth: 0,
    ...type.body,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    padding: 0,
  },
});
