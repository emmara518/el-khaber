/**
 * ActionButton — the shared, role-neutral CTA primitive.
 *
 * One button language for every role (Customer / Technician / Merchant):
 *   • primary          — navy surface, white label (the default action)
 *   • secondary        — white surface, hairline border, navy label
 *   • destructive      — white surface, error border, error label
 *   • destructiveSolid — error surface, white label (confirm dialogs)
 *
 * States: default · pressed · disabled · loading · success. The label
 * uses the semantic type ladder; loading/success communicate through
 * the label + indicator (never colour alone). RTL-safe, 52px target.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';
import { type } from './typography';

import type { ReactNode } from 'react';

export type ActionButtonVariant =
  | 'primary'
  | 'accent'
  | 'secondary'
  | 'destructive'
  | 'destructiveSolid';

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: ActionButtonVariant;
  loading?: boolean;
  success?: boolean;
  disabled?: boolean;
  loadingLabel?: string;
  successLabel?: string;
  /** Optional leading icon (Feather). Hidden while loading. */
  icon?: IconName;
  /** Optional trailing element (e.g. a chevron). */
  trailing?: ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  success = false,
  disabled = false,
  loadingLabel = 'جارٍ التنفيذ…',
  successLabel = 'تم بنجاح',
  icon,
  trailing,
  accessibilityLabel,
  style,
}: ActionButtonProps) {
  const blocked = disabled || loading || success;
  const text = loading ? loadingLabel : success ? successLabel : label;
  const solid = variant !== 'secondary' && variant !== 'destructive';
  const glyphColor = variant === 'accent' || variant === 'secondary' || variant === 'destructive'
    ? color.brand.navy
    : color.surface.base;
  const spinnerColor = variant === 'accent' ? color.brand.navy : solid ? color.surface.base : color.brand.navy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={loading || success ? text : accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      accessibilityLiveRegion="polite"
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        VARIANT[variant].container,
        blocked && styles.disabled,
        pressed && !blocked && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator accessibilityLabel={loadingLabel} color={spinnerColor} />
      ) : (
        <>
          {success ? (
            <Icon name="check" size={18} color={glyphColor} />
          ) : icon ? (
            <Icon name={icon} size={18} color={glyphColor} />
          ) : null}
          <Text style={[styles.label, VARIANT[variant].text]}>{text}</Text>
          {success ? null : trailing}
        </>
      )}
    </Pressable>
  );
}

const VARIANT: Record<
  ActionButtonVariant,
  { container: ViewStyle; text: { color: string } }
> = {
  primary: {
    container: { backgroundColor: color.brand.navy, borderColor: color.brand.navy },
    text: { color: color.surface.base },
  },
  accent: {
    container: { backgroundColor: color.brand.gold, borderColor: color.brand.gold },
    text: { color: color.brand.navy },
  },
  secondary: {
    container: { backgroundColor: color.surface.base, borderColor: color.border.default },
    text: { color: color.brand.navy },
  },
  destructive: {
    container: { backgroundColor: color.surface.base, borderColor: color.error.DEFAULT },
    text: { color: color.error.DEFAULT },
  },
  destructiveSolid: {
    container: { backgroundColor: color.error.DEFAULT, borderColor: color.error.DEFAULT },
    text: { color: color.surface.base },
  },
};

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  label: {
    ...type.button,
    textAlign: 'center',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
});
