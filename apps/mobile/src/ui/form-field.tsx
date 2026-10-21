/**
 * FormField — one labeled text-input primitive for every role.
 *
 * Owns only the shared chrome that was duplicated across merchant/customer
 * forms: right-aligned RTL label → bordered input (with error border) →
 * inline error OR optional hint. It forwards the full `TextInputProps`
 * surface so callers keep keyboardType, secureTextEntry, multiline,
 * editable, autoCapitalize, maxLength, etc. — no behaviour is hidden here.
 *
 * It is deliberately NOT a form engine: validation, draft state and submit
 * stay in the caller. Compose, don't configure.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { type } from './typography';

interface FormFieldProps extends TextInputProps {
  label: string;
  /** Inline error; when present it replaces the hint and marks the input. */
  error?: string | null;
  /** Supporting line shown only when there is no error. */
  hint?: string;
}

export function FormField({ label, error, hint, style, onFocus, onBlur, ...rest }: FormFieldProps) {
  const labelText = rest.accessibilityLabel ?? label;
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={error ? `${labelText}. خطأ: ${error}` : labelText}
        accessibilityState={{ disabled: rest.editable === false }}
        placeholderTextColor={color.text.secondary}
        style={[
          styles.input,
          rest.multiline && styles.multiline,
          focused && styles.inputFocused,
          error ? styles.inputError : null,
          style,
        ]}
        textAlign="right"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.bodyMedium,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing[2],
  },
  input: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    ...type.body,
    color: color.text.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: color.brand.navy,
  },
  inputError: {
    borderColor: color.error.DEFAULT,
  },
  error: {
    ...type.caption,
    color: color.error.DEFAULT,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hint: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
