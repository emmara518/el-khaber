import { color, radius, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

interface AvatarProps {
  /** Display initials (Arabic letters render correctly with the
   *  default system font on iOS and Android). */
  initials: string;
  size?: number;
  background?: string;
  foreground?: string;
  /** Show a small "online / status" dot at the bottom-right. */
  statusDot?: boolean;
  statusColor?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

/**
 * Round avatar with initials. The reference design uses initials in a
 * tinted circle (e.g. the technician "محمد العتيبي" card).
 */
export function Avatar({
  initials,
  size = 48,
  background,
  foreground,
  statusDot = false,
  statusColor,
  style,
  accessibilityLabel,
}: AvatarProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? initials}
      style={[styles.wrap, style]}
    >
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: radius.pill,
            backgroundColor: background ?? color.brand.navy,
          },
        ]}
      >
        <Text
          style={[
            styles.initials,
            { fontSize: size * 0.4, color: foreground ?? color.surface.base },
          ]}
        >
          {initials.slice(0, 1)}
        </Text>
      </View>
      {statusDot ? (
        <View
          style={[
            styles.status,
            {
              backgroundColor: statusColor ?? color.success.DEFAULT,
              width: Math.max(10, size * 0.22),
              height: Math.max(10, size * 0.22),
              borderRadius: radius.pill,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: typography.weight.semibold,
  },
  status: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    borderWidth: 2,
    borderColor: color.surface.base,
  },
});
