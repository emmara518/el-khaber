/**
 * StatTile — a compact operational metric card (icon + value + label).
 *
 * Shared by role dashboards. Plain counts only — never rates,
 * percentages, earnings or any derived business metric. Values must be
 * real/backend-backed.
 */

import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from './icon';
import { type } from './typography';

interface StatTileProps {
  value: string | number;
  label: string;
  icon?: IconName;
}

export function StatTile({ value, label, icon }: StatTileProps) {
  return (
    <View
      style={styles.tile}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${String(value)} ${label}`}
    >
      {icon ? (
        <View style={styles.iconWrap}>
          <Icon name={icon} size={18} color={color.brand.navy} />
        </View>
      ) : null}
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 74,
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
    gap: spacing[1],
    ...shadow.low,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.brand.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { ...type.h2, color: color.brand.navy, textAlign: 'center' },
  label: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
