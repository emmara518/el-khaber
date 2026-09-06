/**
 * Auth form fields.
 *
 * `AuthField` is the single text-input primitive for auth screens
 * (label + input + inline error). `PasswordField` adds the
 * show/hide toggle. Both are fully RTL: right-aligned text, error
 * text, and an Arabic accessible toggle label.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

interface AuthFieldProps extends Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'textContentType' | 'editable' | 'onBlur' | 'maxLength'
> {
  label: string;
  error?: string | null;
  inputLabel: string;
  secureTextEntry?: boolean;
}

export function AuthField({
  label,
  error,
  inputLabel,
  secureTextEntry,
  editable = true,
  ...rest
}: AuthFieldProps) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityRole="none"
        accessibilityLabel={error ? `${inputLabel}. خطأ: ${error}` : inputLabel}
        accessibilityState={{ disabled: !editable }}
        style={[styles.input, error ? styles.inputError : null, !editable && styles.inputDisabled]}
        placeholderTextColor={color.text.secondary}
        textAlign="right"
        secureTextEntry={secureTextEntry}
        editable={editable}
        {...rest}
      />
      {error ? (
        <Text accessibilityRole="alert" accessibilityLabel={`خطأ: ${error}`} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export type PasswordFieldProps = Omit<AuthFieldProps, 'secureTextEntry'>;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <AuthField {...props} secureTextEntry={!visible} />
      <Pressable
        accessibilityRole="togglebutton"
        accessibilityLabel={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        accessibilityState={{ selected: visible }}
        onPress={() => setVisible((v) => !v)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        <Text style={styles.toggleText}>{visible ? 'إخفاء' : 'إظهار'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing[2],
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
    minHeight: 48,
  },
  inputError: {
    borderColor: color.error.DEFAULT,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  error: {
    color: color.error.DEFAULT,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  toggle: {
    alignSelf: 'flex-start',
    marginTop: spacing[2],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  toggleText: {
    color: color.brand.navy,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
  },
});
