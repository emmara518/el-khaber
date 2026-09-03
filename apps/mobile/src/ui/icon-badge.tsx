import { color, radius } from '@khabir/ui-tokens';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

interface IconBadgeProps {
  /** Stable icon glyph. Rendered as a single character for portability
   *  (no icon-font dependency). */
  glyph: string;
  size?: number;
  background?: string;
  foreground?: string;
  style?: ViewStyle;
  /** Accessibility label override (defaults to the glyph). */
  accessibilityLabel?: string;
}

/**
 * A small circular tinted background with a single character icon.
 * Used for the header bell, the avatar tile, and the gold guarantee
 * banner shield.
 */
export function IconBadge({
  glyph,
  size = 40,
  background,
  foreground,
  style,
  accessibilityLabel,
}: IconBadgeProps) {
  const px = size;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? glyph}
      style={[
        styles.root,
        {
          width: px,
          height: px,
          borderRadius: radius.pill,
          backgroundColor: background ?? color.brand.gold,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.glyph,
          { fontSize: size * 0.5, color: foreground ?? color.brand.navy },
        ]}
      >
        {glyph}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontWeight: '700',
  },
});
