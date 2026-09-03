import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

interface PillProps {
  children: ReactNode;
  /** Optional leading glyph rendered in a soft tinted circle. */
  leading?: ReactNode;
  /** Optional trailing glyph (e.g. chevron). */
  trailing?: ReactNode;
  onPress?: () => void;
  /** Override background; defaults to surface.base. */
  background?: string;
  /** Override text color; defaults to text.primary. */
  color?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

/**
 * Rounded pill, used for the location selector on the Home screen.
 * Becomes pressable when an `onPress` is provided.
 */
export function Pill({
  children,
  leading,
  trailing,
  onPress,
  background,
  color: textColor,
  style,
  accessibilityLabel,
  accessibilityHint,
}: PillProps) {
  const isInteractive = typeof onPress === 'function';
  const Comp = isInteractive ? Pressable : View;
  return (
    <Comp
      {...(isInteractive ? { onPress } : {})}
      accessible
      accessibilityRole={isInteractive ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[
        styles.root,
        { backgroundColor: background ?? color.surface.base },
        style,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <Text style={[styles.label, { color: textColor ?? color.text.primary }]} numberOfLines={1}>
        {children}
      </Text>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </Comp>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
  },
  leading: {
    marginEnd: spacing[2],
  },
  trailing: {
    marginStart: spacing[2],
  },
  label: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
});
