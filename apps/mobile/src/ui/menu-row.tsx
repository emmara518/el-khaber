/**
 * Shared menu row for settings / profile menus (all roles).
 *
 * One consistent pattern: leading icon in a soft navy tile, label,
 * optional hint line, then a trailing state — "coming soon" pill,
 * chevron (for navigable rows) or nothing. Replaces the per-screen
 * emoji-icon menus with the unified vector icon system.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Icon, type IconName } from './icon';
import { type } from './typography';

interface MenuRowProps {
  icon: IconName;
  label: string;
  hint?: string;
  /** When set the row is non-interactive and shows a "soon" badge. */
  soonLabel?: string;
  onPress?: () => void;
  /** Extra trailing element (e.g. a status pill) when not "soon". */
  trailing?: ReactNode;
  iconBackground?: string;
  iconColor?: string;
  style?: ViewStyle;
}

export function MenuRow({
  icon,
  label,
  hint,
  soonLabel,
  onPress,
  trailing,
  iconBackground,
  iconColor,
  style,
}: MenuRowProps) {
  const interactive = typeof onPress === 'function';
  return (
    <Pressable
      accessibilityRole={interactive ? 'button' : 'text'}
      accessibilityLabel={soonLabel ? `${label}، ${soonLabel}` : hint ? `${label}. ${hint}` : label}
      onPress={onPress}
      disabled={!interactive}
      style={({ pressed }) => [styles.row, pressed && interactive && styles.pressed, style]}
    >
      <View style={[styles.iconTile, { backgroundColor: iconBackground ?? color.surface.subtle }]}>
        <Icon name={icon} size={18} color={iconColor ?? color.brand.navy} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {soonLabel ? (
        <View style={styles.soon}>
          <Text style={styles.soonText}>{soonLabel}</Text>
        </View>
      ) : interactive ? (
        <Icon name="chevron-left" size={18} color={color.text.secondary} />
      ) : (
        (trailing ?? null)
      )}
    </Pressable>
  );
}

export function MenuDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    minHeight: 64,
  },
  pressed: {
    opacity: 0.65,
    backgroundColor: color.surface.subtle,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: spacing[3],
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    ...type.cardTitle,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rowHint: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[1] + 1,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  soon: {
    backgroundColor: color.surface.subtle,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  soonText: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.border.default,
    marginHorizontal: spacing[4],
  },
});
