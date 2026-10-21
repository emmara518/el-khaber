import { color, radius } from '@khabir/ui-tokens';
import { useState } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { fontFamily } from './typography';

interface AvatarProps {
  /** Display initials (Arabic letters render correctly with the
   *  default system font on iOS and Android). */
  initials: string;
  /**
   * Server-issued public image URL (WP-01). When present the photo is
   * shown; on load failure (or when absent) the initials fallback
   * renders — the UI never shows a broken image box.
   */
  imageUrl?: string | null;
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
 * tinted circle (e.g. the technician "محمد عبد الله" card). Since
 * WP-01 a server-provided photo replaces the initials when available.
 */
export function Avatar({
  initials,
  imageUrl,
  size = 48,
  background,
  foreground,
  statusDot = false,
  statusColor,
  style,
  accessibilityLabel,
}: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = imageUrl !== undefined && imageUrl !== null && imageUrl.length > 0 && !failed;
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
        {showImage ? (
          <Image
            source={{ uri: imageUrl as string }}
            style={{ width: size, height: size, borderRadius: radius.pill }}
            onError={() => setFailed(true)}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <Text
            style={[
              styles.initials,
              { fontSize: size * 0.4, color: foreground ?? color.surface.base },
            ]}
          >
            {initials.slice(0, 1)}
          </Text>
        )}
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
    fontFamily: fontFamily.semibold,
  },
  status: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    borderWidth: 2,
    borderColor: color.surface.base,
  },
});
