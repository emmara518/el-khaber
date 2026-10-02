/**
 * Chip — one canonical chip language for every role.
 *
 * Three explicit, non-overlapping uses (never forced into one behaviour):
 *
 *  • `select` (single) — an exclusive filter pill. Selected = navy surface
 *    with a check + white label (state is never colour-only).
 *  • `toggle` (multiple) — a non-exclusive option. Selected = navy border +
 *    check + a heavier label.
 *  • no `onPress` — a passive display chip (read-only value), never
 *    interactive and never announced as a control.
 *
 * The shell (radius, min 44px target, RTL, padding) is shared so every chip
 * in the product reads identically. Semantics come from `selectionMode`.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';
import { fontFamily, type } from './typography';

export type ChipSelectionMode = 'single' | 'multiple';

export interface ChipProps {
  label: string;
  /** Omit to render a passive, non-interactive display chip. */
  onPress?: () => void;
  selected?: boolean;
  /** Only meaningful when `onPress` is provided. Defaults to `single`. */
  selectionMode?: ChipSelectionMode;
  /** Optional leading glyph (e.g. a filter category icon). */
  icon?: IconName;
  /** Disables interaction (announced via accessibilityState). */
  disabled?: boolean;
  /**
   * Accessibility label override. For filters, pass a group-aware label
   * (e.g. "المهارة: سباكة") so screen readers announce context.
   */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  onPress,
  selected = false,
  selectionMode = 'single',
  icon,
  disabled = false,
  accessibilityLabel,
  style,
}: ChipProps) {
  const interactive = typeof onPress === 'function';

  if (!interactive) {
    return (
      <View style={[styles.base, styles.display, style]}>
        <Text style={styles.displayText} numberOfLines={1}>
          {label}
        </Text>
      </View>
    );
  }

  const toggle = selectionMode === 'multiple';
  return (
    <Pressable
      accessibilityRole={toggle ? 'checkbox' : 'tab'}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={toggle ? { checked: selected, disabled } : { selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        toggle ? styles.toggle : styles.filter,
        selected && (toggle ? styles.toggleOn : styles.filterOn),
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={16}
          color={selected && !toggle ? color.surface.base : color.text.secondary}
        />
      ) : toggle && selected ? (
        <Icon name="check" size={16} color={color.brand.navy} />
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          toggle ? styles.toggleText : styles.filterText,
          selected && (toggle ? styles.toggleTextOn : styles.filterTextOn),
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    maxWidth: '100%',
    minHeight: 44,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderWidth: 1,
  },
  /* Single-select filter — navy fill when selected. */
  filter: {
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
  },
  filterOn: {
    borderColor: color.brand.navy,
    backgroundColor: color.brand.navy,
  },
  filterText: {
    ...type.bodyMedium,
    color: color.text.secondary,
    flexShrink: 1,
  },
  filterTextOn: {
    color: color.surface.base,
    fontFamily: fontFamily.bold,
  },
  /* Multi-select toggle — navy border + check when selected. */
  toggle: {
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
  },
  toggleOn: {
    borderColor: color.brand.navy,
    borderWidth: 2,
  },
  toggleText: {
    ...type.bodyMedium,
    color: color.text.secondary,
    flexShrink: 1,
  },
  toggleTextOn: {
    color: color.text.primary,
    fontFamily: fontFamily.bold,
  },
  /* Passive display chip. */
  display: {
    borderColor: color.border.default,
    backgroundColor: color.surface.subtle,
    justifyContent: 'center',
  },
  displayText: {
    ...type.caption,
    color: color.text.primary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.55 },
});
