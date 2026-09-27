/**
 * Auth form fields.
 *
 * `AuthField` is the single text-input primitive for auth screens:
 * label → input (with optional leading icon / trailing slot) →
 * helper / inline error. `PasswordField` adds an integrated show/hide
 * eye toggle inside the field (no standalone "إظهار" text), plus a
 * leading lock icon.
 *
 * Both are fully RTL: right-aligned labels, text, helper and error copy,
 * RTL icon placement, and Arabic accessible labels. Every control keeps
 * a ≥44px touch target.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Icon, type IconName } from '@/ui/icon';
import { type } from '@/ui/typography';

interface AuthFieldProps extends Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'keyboardType' | 'autoCapitalize' | 'autoComplete' | 'textContentType' | 'editable' | 'onBlur' | 'maxLength'
> {
  label: string;
  error?: string | null;
  /** Supporting helper line (shown when there is no error). */
  hint?: string;
  /** Leading (start / right in RTL) icon inside the field. */
  startIcon?: IconName;
  /** Trailing (end / left in RTL) control inside the field. */
  endSlot?: ReactNode;
  inputLabel: string;
  secureTextEntry?: boolean;
}

const PLACEHOLDER = color.text.secondary;

export function AuthField({
  label,
  error,
  hint,
  startIcon,
  endSlot,
  inputLabel,
  secureTextEntry,
  editable = true,
  onBlur,
  ...rest
}: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          error ? styles.fieldError : null,
          !editable && styles.fieldDisabled,
        ]}
      >
        {startIcon ? <Icon name={startIcon} size={20} color={color.text.secondary} /> : null}
        <TextInput
          accessibilityRole="none"
          accessibilityLabel={error ? `${inputLabel}. خطأ: ${error}` : inputLabel}
          accessibilityState={{ disabled: !editable }}
          style={styles.input}
          placeholderTextColor={PLACEHOLDER}
          textAlign="right"
          secureTextEntry={secureTextEntry}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
        {endSlot ?? null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" accessibilityLabel={`خطأ: ${error}`} style={styles.error}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export type PasswordFieldProps = Omit<AuthFieldProps, 'secureTextEntry' | 'endSlot'>;

export function PasswordField({ startIcon = 'lock', ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthField
      {...props}
      startIcon={startIcon}
      secureTextEntry={!visible}
      endSlot={
        <Pressable
          accessibilityRole="togglebutton"
          accessibilityLabel={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
          accessibilityState={{ selected: visible }}
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} size={20} color={color.text.secondary} />
        </Pressable>
      }
    />
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.label,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: spacing[2],
  },
  field: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[3],
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[4],
    minHeight: 52,
  },
  fieldFocused: {
    borderColor: color.brand.navy,
  },
  fieldError: {
    borderColor: color.error.DEFAULT,
  },
  fieldDisabled: {
    opacity: 0.6,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: color.text.primary,
    ...type.body,
    paddingVertical: spacing[3],
  },
  toggle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  pressed: {
    opacity: 0.6,
  },
});
