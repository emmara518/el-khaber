import { color, radius, shadow, spacing } from '@khabir/ui-tokens';
import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

interface CardProps {
  children: ReactNode;
  /** Override the card's background. Defaults to surface.base (white). */
  background?: string;
  /** Override the border color. Defaults to border.default. */
  borderColor?: string;
  /** Override the border radius. Defaults to radius.lg. */
  borderRadius?: number;
  /** Disable the default elevation. */
  flat?: boolean;
  /** Add horizontal + vertical padding. */
  padded?: boolean;
  style?: ViewStyle;
}

/**
 * Generic card surface. The default style matches the reference
 * (white surface, soft border, lg radius, low elevation).
 */
export function Card({
  children,
  background,
  borderColor,
  borderRadius,
  flat = false,
  padded = false,
  style,
}: CardProps) {
  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: background ?? color.surface.base,
          borderColor: borderColor ?? color.border.default,
          borderRadius: borderRadius ?? radius.lg,
          padding: padded ? spacing[4] : 0,
        },
        flat ? null : shadow.low,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
  },
});
