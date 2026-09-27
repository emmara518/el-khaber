/**
 * Section divider with a centred label ("… أو …").
 *
 * A hairline rule on both sides of muted label copy. RTL-symmetric and
 * decorative only (hidden from assistive tech — the label is presentational).
 */

import { color, spacing } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { type } from '@/ui/typography';

export function OrDivider({ label }: { label: string }) {
  return (
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    gap: spacing[3],
  },
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: color.border.default,
  },
  label: {
    ...type.label,
    color: color.text.secondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
