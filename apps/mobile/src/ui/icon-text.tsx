import { color, spacing, typography } from '@khabir/ui-tokens';
import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fontFamily } from './typography';

interface IconTextProps {
  glyph: ReactNode;
  label: string;
  /** Tint the glyph / label. Defaults to the brand gold. */
  color?: string;
  size?: 'sm' | 'md';
}

/**
 * Icon + label row used inside technician / order cards
 * (e.g. the gold star + rating value, the calendar + date).
 */
export function IconText({ glyph, label, color: textColor, size = 'md' }: IconTextProps) {
  return (
    <View style={styles.row}>
      <View style={styles.glyphWrap}>
        <Text
          style={[
            styles.glyph,
            {
              color: textColor ?? color.brand.gold,
              fontSize: size === 'sm' ? typography.size.caption : typography.size.body,
            },
          ]}
        >
          {glyph}
        </Text>
      </View>
      <Text
        style={[
          styles.label,
          {
            color: textColor ?? color.text.primary,
            fontSize: size === 'sm' ? typography.size.caption : typography.size.body,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  glyphWrap: {
    marginEnd: spacing[1],
  },
  glyph: {
    fontFamily: fontFamily.semibold,
  },
  label: {
    fontFamily: fontFamily.regular,
  },
});
