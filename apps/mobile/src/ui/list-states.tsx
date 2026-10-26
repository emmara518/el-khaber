/**
 * Shared async list states — one definition of loading / empty / error
 * for every role (Customer / Technician / Merchant).
 *
 * Visuals come from the approved local asset system: a neutral panel
 * holding a contained brand mark for empty/feedback, or a scene where a
 * full-bleed frame is intended. Never tinted, never cropped.
 *
 * This is the role-neutral home of the primitives; the Technician
 * surface consumes these directly so it no longer reaches into the
 * Customer feature tree.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BrandImage } from './brand-image';
import { Card } from './card';
import { Icon, type IconName } from './icon';
import { sceneAssets, type SceneAssetName } from './scene-assets';
import { type } from './typography';

import type { BrandAssetName } from './brand-assets';

function StateScene({ asset, height = 128 }: { asset?: SceneAssetName; height?: number }) {
  if (!asset) return null;
  return (
    <Image
      source={sceneAssets[asset]}
      accessible={false}
      importantForAccessibility="no"
      resizeMode="cover"
      style={[styles.scene, { height }]}
    />
  );
}

/** Neutral panel holding a contained brand asset — never tinted or cropped. */
function StateBrand({ name, size = 128 }: { name: BrandAssetName; size?: number }) {
  return (
    <View style={[styles.brandPanel, { width: size, height: size }]}>
      <BrandImage name={name} size={Math.round(size * 0.8)} />
    </View>
  );
}

export function ListLoading({
  label,
  brandAsset,
}: {
  label: string;
  asset?: SceneAssetName;
  brandAsset?: BrandAssetName;
}) {
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );
  }, [opacity]);
  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={[styles.skeletonCard, pulse]}
    >
      <View style={styles.skeletonHeader}>
        {brandAsset ? (
          <StateBrand name={brandAsset} size={44} />
        ) : (
          <View style={styles.skeletonAvatar} />
        )}
        <View style={styles.skeletonLines}>
          <View style={[styles.skeletonLine, styles.skeletonLineTitle]} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
        </View>
      </View>
      {[0, 1, 2].map((row) => (
        <View key={row} style={styles.skeletonRow}>
          <View style={styles.skeletonSquare} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, styles.skeletonLineWide]} />
            <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

export function ListEmpty({
  icon,
  iconLabel,
  title,
  body,
  actionLabel,
  onAction,
  asset,
  brandAsset,
}: {
  icon: IconName;
  iconLabel: string;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  asset?: SceneAssetName;
  brandAsset?: BrandAssetName;
}) {
  return (
    <Card background={color.surface.base} padded style={styles.center}>
      {brandAsset ? (
        <StateBrand name={brandAsset} />
      ) : asset ? (
        <StateScene asset={asset} />
      ) : (
        <View accessibilityRole="image" accessibilityLabel={iconLabel} style={styles.iconWrap}>
          <Icon name={icon} size={26} color={color.text.secondary} accessible={false} />
        </View>
      )}
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.muted}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export function ListError({
  title,
  message,
  retryLabel,
  onRetry,
  asset,
  brandAsset = 'something-wrong',
}: {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
  asset?: SceneAssetName;
  brandAsset?: BrandAssetName;
}) {
  return (
    <Card background={color.surface.base} padded style={styles.center}>
      {brandAsset ? (
        <StateBrand name={brandAsset} />
      ) : asset ? (
        <StateScene asset={asset} />
      ) : (
        <View accessibilityRole="image" accessibilityLabel="خطأ" style={[styles.iconWrap, styles.iconWrapError]}>
          <Icon name="cloud-off" size={26} color={color.error.DEFAULT} accessible={false} />
        </View>
      )}
      <Text accessibilityRole="alert" accessibilityLabel={`${title}. ${message}`} style={styles.title}>
        {title}
      </Text>
      <Text style={styles.muted}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
        onPress={onRetry}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaText}>{retryLabel}</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  skeletonCard: {
    backgroundColor: color.surface.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: color.border.default,
    padding: spacing[4],
    marginTop: spacing[5],
    gap: spacing[3],
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[1],
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  skeletonAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.border.default,
  },
  skeletonSquare: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: color.border.default,
  },
  skeletonLines: {
    flex: 1,
    gap: spacing[2],
  },
  skeletonLine: {
    height: 10,
    borderRadius: 5,
    backgroundColor: color.border.default,
  },
  skeletonLineTitle: {
    width: '55%',
    height: 14,
  },
  skeletonLineWide: {
    width: '85%',
  },
  skeletonLineShort: {
    width: '45%',
  },
  scene: {
    width: '100%',
    borderRadius: radius.lg,
    backgroundColor: color.brand.navyDeep,
  },
  brandPanel: {
    borderRadius: radius.lg,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    marginTop: spacing[5],
    gap: spacing[2],
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapError: {
    backgroundColor: color.error.soft,
  },
  title: {
    ...type.h3,
    color: color.text.primary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  muted: {
    ...type.body,
    color: color.text.secondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  cta: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing[5],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[2],
  },
  pressed: {
    opacity: 0.85,
  },
  ctaText: {
    ...type.button,
    color: color.surface.base,
  },
});
