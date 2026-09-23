/**
 * AppButton — the single CTA primitive for the Customer experience.
 *
 * One component, four approved variants, so every screen speaks the same
 * button language:
 *   • primary   — deep navy surface, ivory label (the default action)
 *   • gold      — warm gold surface, navy label (hero / highlight action)
 *   • secondary — bordered ivory surface, navy label (alternative action)
 *   • ghost     — text-only, navy label (tertiary / inline action)
 *
 * Sizes keep touch targets ≥ 44px. Colors, radii, spacing and type come
 * from the shared tokens + typography system (no local hex values).
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';
import { type } from './typography';

export type AppButtonVariant = 'primary' | 'gold' | 'secondary' | 'ghost';
export type AppButtonSize = 'md' | 'sm';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  /** Trailing icon (rendered on the leading edge in RTL). */
  icon?: IconName;
  /** Leading icon (rendered on the trailing edge in RTL). */
  iconEnd?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

const MIN_HEIGHT: Record<AppButtonSize, number> = { md: 52, sm: 44 };

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconEnd,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  style,
}: AppButtonProps) {
  const tone = TONE[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { minHeight: MIN_HEIGHT[size], backgroundColor: tone.background },
        variant === 'secondary' && styles.bordered,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={tone.foreground} /> : null}
          <Text style={[styles.label, { color: tone.foreground }]} numberOfLines={1}>
            {label}
          </Text>
          {iconEnd ? <Icon name={iconEnd} size={size === 'sm' ? 16 : 18} color={tone.foreground} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const TONE: Record<AppButtonVariant, { background: string; foreground: string }> = {
  primary: { background: color.brand.navy, foreground: color.surface.base },
  gold: { background: color.brand.gold, foreground: color.brand.navy },
  secondary: { background: color.surface.base, foreground: color.brand.navy },
  ghost: { background: 'transparent', foreground: color.brand.navy },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
  },
  bordered: {
    borderWidth: 1,
    borderColor: color.border.default,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  label: {
    ...type.button,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
  inactive: {
    opacity: 0.5,
  },
});
