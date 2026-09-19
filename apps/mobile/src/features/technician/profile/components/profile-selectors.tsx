/**
 * Shared profile selectors (T-B) — one coherent selector language
 * used by BOTH the onboarding steps and the profile edit form:
 * multi-select chips (text + check icon + border, never color alone) and a
 * labeled input with inline errors. No duplication between flows.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/ui/icon';

export function LabeledInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  error?: string | null;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={error ? `${label}. خطأ: ${error}` : label}
        placeholder={placeholder}
        placeholderTextColor={color.text.secondary}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline, error ? styles.inputError : null]}
        textAlign="right"
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function MultiSelectChips<T extends string>({
  label,
  options,
  selected,
  onToggle,
  error,
}: {
  label: string;
  options: ReadonlyArray<T>;
  selected: ReadonlyArray<T>;
  onToggle: (value: T) => void;
  error?: string | null;
}) {
  return (
    <View style={styles.field}>
      <Text
        accessibilityRole="header"
        accessibilityLabel={`${label}. المحدد: ${selected.length}`}
        style={styles.label}
      >
        {label}
      </Text>
      <View style={styles.chips}>
        {options.map((option) => {
          const on = selected.includes(option);
          return (
            <Pressable
              key={option}
              accessibilityRole="checkbox"
              accessibilityLabel={`${option}${on ? '، محدد' : ''}`}
              accessibilityState={{ selected: on, checked: on }}
              onPress={() => onToggle(option)}
              style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
            >
              {on ? <Icon name="check" size={14} color={color.brand.navy} /> : null}
              <Text style={[styles.chipText, on && styles.chipTextOn]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing[2],
  },
  label: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  input: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    color: color.text.primary,
    fontSize: typography.size.body,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: color.error.DEFAULT,
  },
  error: {
    color: color.error.DEFAULT,
    fontSize: typography.size.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1] + 2,
  },
  chipOn: {
    borderColor: color.brand.navy,
    borderWidth: 2,
    backgroundColor: color.surface.base,
  },
  pressed: {
    opacity: 0.75,
  },
  chipText: {
    color: color.text.secondary,
    fontSize: typography.size.body,
  },
  chipTextOn: {
    color: color.text.primary,
    fontWeight: typography.weight.bold,
  },
});
