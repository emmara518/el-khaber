/**
 * Shared async list states for Customer screens (docs/04_UI_UX.md §23).
 *
 * One file, three small primitives — `ListLoading`, `ListEmpty`,
 * `ListError` — reused by Requests / Maintenance / Messages / Discovery so
 * every list defines loading, empty, error, and retry identically.
 *
 * Visuals come from the approved asset system. Prefer `brandAsset`
 * (neutral panel, contained) for empty/feedback art; the legacy scene
 * `asset` remains supported where a full-bleed scene is intended.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { BrandAssetName } from '@/ui/brand-assets';

import { BrandImage } from '@/ui/brand-image';
import { Card } from '@/ui/card';
import { Icon, type IconName } from '@/ui/icon';
import { sceneAssets, type SceneAssetName } from '@/ui/scene-assets';
import { type } from '@/ui/typography';

function StateScene({ asset, height = 128 }: { asset?: SceneAssetName; height?: number }) {
  if (!asset) {
    return null;
  }
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
  asset,
  brandAsset,
}: {
  label: string;
  asset?: SceneAssetName;
  brandAsset?: BrandAssetName;
}) {
  return (
    <Card background={color.surface.base} padded style={styles.center}>
      {brandAsset ? <StateBrand name={brandAsset} size={112} /> : <StateScene asset={asset} height={112} />}
      <ActivityIndicator accessibilityLabel={label} color={color.brand.navy} />
      <Text style={styles.muted}>{label}</Text>
    </Card>
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
          <Icon name={icon} size={26} color={color.text.secondary} accessibilityLabel={iconLabel} />
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
  /** Feedback art; defaults to the approved `something-wrong` mark. */
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
          <Icon name="cloud-off" size={26} color={color.error.DEFAULT} accessibilityLabel="خطأ" />
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

/**
 * Success / confirmation state. Uses the approved `success` brand mark by
 * default so booking, rating and submission confirmations share one visual
 * language. Never fabricates content — the caller supplies the copy.
 */
export function ListSuccess({
  title,
  body,
  actionLabel,
  onAction,
  brandAsset = 'success',
}: {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  brandAsset?: BrandAssetName;
}) {
  return (
    <Card background={color.surface.base} padded style={styles.center}>
      <StateBrand name={brandAsset} />
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

const styles = StyleSheet.create({
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
