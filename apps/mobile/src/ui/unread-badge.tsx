/**
 * UnreadBadge — the one unread-count badge for every role.
 *
 * The header bell, the customer conversations list and the merchant messages
 * list each carried their own `badge`/`badgeText` styles that had drifted
 * (18 / 22 / 26 px, navigation vs caption type). This owns that chrome so an
 * unread count reads identically everywhere.
 *
 * It is presentational only: the caller decides when to render it (typically
 * `count > 0`) and whether it is positioned absolutely (header) or inline
 * (list rows) via `style`. Counts above 99 saturate to "99+".
 */

import { color, spacing } from '@khabir/ui-tokens';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { fontFamily, type } from './typography';

export interface UnreadBadgeProps {
  count: number;
  /** Accessible name, e.g. "3 غير مقروء". Caller owns the copy/locale. */
  accessibilityLabel?: string;
  /**
   * Optional label formatter. Defaults to ASCII with "99+" saturation. Pass a
   * formatter to keep a locale numeral system (e.g. Arabic-Indic) where the
   * surrounding UI uses one.
   */
  format?: (count: number) => string;
  style?: StyleProp<ViewStyle>;
}

export function UnreadBadge({ count, accessibilityLabel, format, style }: UnreadBadgeProps) {
  if (count <= 0) return null;
  const label = format ? format(count) : count > 99 ? '99+' : String(count);
  return (
    <View
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="text"
      style={[styles.badge, style]}
    >
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: spacing[1],
    backgroundColor: color.error.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { ...type.caption, color: color.surface.base, fontFamily: fontFamily.bold },
});
