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
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Icon } from './icon';
import { type } from './typography';

/**
 * The browser default focus ring is drawn around the inner input, not the
 * pill. Focus is expressed by the pill border instead (keyboard/pointer
 * focus remains visible, on-brand).
 */
const WEB_INPUT_RESET =
  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;

interface SearchFieldProps {
  placeholder: string;
  /** Navigation-trigger mode. */
  onPress?: () => void;
  /** Live-input mode. */
  value?: string;
  onChangeText?: (text: string) => void;
  /** Live-input mode: optional clear affordance (shown only with a value). */
  onClear?: () => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

export function SearchField({
  placeholder,
  onPress,
  value,
  onChangeText,
  onClear,
  accessibilityLabel,
  style,
}: SearchFieldProps) {
  const label = accessibilityLabel ?? placeholder;
  const [focused, setFocused] = useState(false);

  const chrome = (inner: React.ReactNode) => (
    <View style={[styles.surface, focused && styles.surfaceFocused, style]}>
      <View style={styles.lead}>
        <Icon name="search" size={18} color={color.brand.navy} />
      </View>
      {inner}
    </View>
  );

  if (onPress && onChangeText === undefined) {
    return (
      <Pressable
        accessibilityRole="button"
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

  const showClear =
    typeof onClear === 'function' && typeof value === 'string' && value.length > 0;

  return chrome(
    <>
      <TextInput
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor={color.text.secondary}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, WEB_INPUT_RESET]}
        returnKeyType="search"
      />
      {showClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="مسح البحث"
          onPress={onClear}
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
        >
          <Icon name="x" size={18} color={color.text.secondary} />
        </Pressable>
      ) : null}
    </>,
  );
}

const styles = StyleSheet.create({
  surface: {
    flexDirection: 'row',
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
  surfaceFocused: {
    borderColor: color.brand.navy,
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
  clear: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
