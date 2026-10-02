/**
 * Auth feedback primitives: alert banner + primary button.
 *
 * `AuthAlert` renders server/form errors (error) and confirmation
 * states (success) without ever crashing the route. `AuthButton`
 * is the single Navy primary CTA (docs/04_UI_UX.md §11) with
 * loading/disabled states.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionButton, Icon, type IconName } from '@/ui';

type AlertKind = 'error' | 'success' | 'info';

export function AuthAlert({
  kind,
  message,
}: {
  kind: AlertKind;
  message: string;
}) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel={message}
      style={[styles.alert, kind === 'error' ? styles.alertError : kind === 'success' ? styles.alertSuccess : styles.alertInfo]}
    >
      <Text style={[styles.alertText, kind === 'error' ? styles.alertErrorText : null]}>
        {message}
      </Text>
    </View>
  );
}

/**
 * Auth primary CTA — the shared navy `ActionButton` (primary) with an
 * optional trailing icon, kept as a thin wrapper so the auth surface has one
 * button implementation, not a parallel one.
 */
export function AuthButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  trailingIcon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Optional trailing (end / left in RTL) icon. */
  trailingIcon?: IconName;
}) {
  return (
    <ActionButton
      variant="primary"
      label={label}
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      trailing={trailingIcon ? <Icon name={trailingIcon} size={20} color={color.surface.base} /> : undefined}
    />
  );
}

export function AuthLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  alert: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  alertError: {
    backgroundColor: color.error.soft,
    borderColor: color.error.DEFAULT,
  },
  alertSuccess: {
    backgroundColor: color.success.soft,
    borderColor: color.success.DEFAULT,
  },
  alertInfo: {
    backgroundColor: color.surface.subtle,
    borderColor: color.border.default,
  },
  alertText: {
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  alertErrorText: {
    color: color.error.DEFAULT,
  },
  link: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  linkText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
});
