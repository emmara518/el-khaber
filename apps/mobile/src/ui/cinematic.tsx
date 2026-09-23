import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { brandAssets, type BrandAssetName } from './brand-assets';
import { Icon } from './icon';
import { sceneAssets, type SceneAssetName } from './scene-assets';

import type { ReactNode } from 'react';

const reveal = FadeIn.duration(220).reduceMotion(ReduceMotion.System);
const bands = [0.04, 0.08, 0.14, 0.22, 0.32, 0.44, 0.57, 0.7, 0.81, 0.9, 0.96, 1];

type SceneImage = { asset: SceneAssetName; image?: never } | { image: ImageSourcePropType; asset?: never };

export type SceneHeroProps = SceneImage & {
  eyebrow: string;
  title: string;
  body?: string;
  children?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
};

export type SceneActionProps = {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  success?: boolean;
  loadingLabel?: string;
  successLabel?: string;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
};

export type SceneSectionProps = {
  title: string;
  eyebrow?: string;
  body?: string;
  asset?: SceneAssetName;
  children?: ReactNode;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export type SceneObjectProps = {
  /** Scene (webp) artwork. Ignored when `brandAsset` is provided. */
  asset?: SceneAssetName;
  /** Approved brand WebP emblem (appliance categories). */
  brandAsset?: BrandAssetName;
  title: string;
  body?: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

function useScenePress() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const animate = (pressed: boolean) => {
    scale.value = withTiming(pressed ? 0.98 : 1, {
      duration: pressed ? 100 : 150,
      reduceMotion: ReduceMotion.System,
    });
  };
  return { style, onPressIn: () => animate(true), onPressOut: () => animate(false) };
}

export function applianceSceneAsset(slug: string): SceneAssetName | undefined {
  switch (slug) {
    case 'washing_machine': return 'appliance_washing_machine';
    case 'refrigerator': return 'appliance_refrigerator';
    case 'air_conditioner': return 'appliance_air_conditioner';
    default: return undefined;
  }
}

/**
 * Appliance category emblem from the approved brand WebP set. Same slug
 * vocabulary as `applianceSceneAsset`; only the three shipping categories
 * map (fan / other-appliance are intentionally not wired).
 */
export function applianceBrandAsset(slug: string): BrandAssetName | undefined {
  switch (slug) {
    case 'washing_machine': return 'washing-machine';
    case 'refrigerator': return 'refrigerator';
    case 'air_conditioner': return 'air-conditioner';
    default: return undefined;
  }
}

export function SceneHero({ asset, image, eyebrow, title, body, children, action, compact = false }: SceneHeroProps) {
  const sceneHeight = compact ? 148 : 252;
  return (
    <View style={styles.hero}>
      <Image
        source={asset ? sceneAssets[asset] : image}
        accessible={false}
        importantForAccessibility="no"
        resizeMode="cover"
        style={[styles.heroImage, { height: sceneHeight + 80 }]}
      />
      <View pointerEvents="none" style={[styles.tint, { height: sceneHeight + 80 }]} />
      <View style={{ height: sceneHeight }} />
      <Animated.View entering={reveal} style={styles.heroContent}>
        <View pointerEvents="none" style={styles.scrim}>
          {bands.map((opacity) => <View key={opacity} style={[styles.band, { opacity }]} />)}
        </View>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text accessibilityRole="header" style={[styles.heroTitle, compact && styles.compactTitle]}>{title}</Text>
        {body ? <Text style={styles.heroBody}>{body}</Text> : null}
        {children}
        {action ? <View style={styles.heroAction}>{action}</View> : null}
      </Animated.View>
    </View>
  );
}

export function SceneAction({ label, onPress, accessibilityLabel, disabled = false, loading = false, success = false, loadingLabel = 'جارٍ التحميل…', successLabel = 'تم بنجاح', variant = 'primary', style }: SceneActionProps) {
  const press = useScenePress();
  const blocked = disabled || loading || success;
  const text = loading ? loadingLabel : success ? successLabel : label;
  return (
    <Animated.View style={[style, press.style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={loading || success ? text : accessibilityLabel ?? label}
        accessibilityState={{ disabled: blocked, busy: loading }}
        accessibilityLiveRegion="polite"
        disabled={blocked}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [styles.action, variant === 'secondary' && styles.secondary, success && styles.success, disabled && styles.disabled, pressed && styles.pressed]}
      >
        <Text style={styles.actionText}>{text}</Text>
        <Icon name={loading ? 'clock' : success ? 'check' : 'arrow-left'} size={20} color={color.brand.navy} />
      </Pressable>
    </Animated.View>
  );
}

export function SceneSection({ title, eyebrow, body, asset, children, action, style }: SceneSectionProps) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHeading}>
        <View style={styles.sectionCopy}>
          {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
          <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
          {body ? <Text style={styles.sectionBody}>{body}</Text> : null}
        </View>
        {asset ? <Image source={sceneAssets[asset]} accessible={false} style={styles.sectionImage} resizeMode="cover" /> : null}
      </View>
      {children}
      {action}
    </View>
  );
}

export function SceneObject({ asset, brandAsset, title, body, selected = false, onPress, accessibilityLabel, style }: SceneObjectProps) {
  const press = useScenePress();
  return (
    <Animated.View style={[styles.objectWrap, style, press.style]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={accessibilityLabel ?? [title, body].filter(Boolean).join('، ')}
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => [styles.object, selected && styles.objectSelected, pressed && styles.pressed]}
      >
        {brandAsset ? (
          <Image source={brandAssets[brandAsset]} accessible={false} resizeMode="contain" style={styles.objectImage} />
        ) : asset ? (
          <Image source={sceneAssets[asset]} accessible={false} resizeMode="contain" style={styles.objectImage} />
        ) : (
          <View style={styles.objectImage}><Icon name="search" size={32} color={color.brand.navy} /></View>
        )}
        <View style={styles.objectLabel}>
          <Text style={styles.objectTitle}>{title}</Text>
          {selected ? <Icon name="check" size={18} color={color.brand.navy} /> : null}
        </View>
        {body ? <Text style={styles.objectBody}>{body}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: color.brand.navy, overflow: 'hidden', borderBottomStartRadius: radius.xl, borderBottomEndRadius: radius.xl, direction: 'rtl' },
  heroImage: { position: 'absolute', top: 0, left: 0, width: '100%' },
  tint: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: color.brand.navy, opacity: 0.14 },
  heroContent: { backgroundColor: color.brand.navy, paddingHorizontal: spacing[6], paddingBottom: spacing[6], gap: spacing[2] },
  scrim: { position: 'absolute', top: -80, height: 80, left: 0, right: 0 },
  band: { flex: 1, backgroundColor: color.brand.navy },
  eyebrow: { color: color.brand.gold, fontSize: typography.size.caption, fontWeight: typography.weight.semibold, textAlign: 'right', writingDirection: 'rtl', lineHeight: 22 },
  heroTitle: { color: color.surface.base, fontSize: 32, fontWeight: typography.weight.bold, lineHeight: 46, textAlign: 'right', writingDirection: 'rtl' },
  compactTitle: { fontSize: typography.size.h2, lineHeight: 36 },
  heroBody: { color: color.border.default, fontSize: typography.size.body, lineHeight: 28, textAlign: 'right', writingDirection: 'rtl' },
  heroAction: { marginTop: spacing[3] },
  action: { minHeight: 56, paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: color.brand.gold, borderRadius: radius.md, flexDirection: 'row', direction: 'rtl', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] },
  actionText: { flexShrink: 1, color: color.brand.navy, fontSize: typography.size.button, fontWeight: typography.weight.bold, lineHeight: 28, textAlign: 'right', writingDirection: 'rtl' },
  secondary: { backgroundColor: color.surface.base, borderWidth: 1, borderColor: color.border.default },
  success: { backgroundColor: color.success.soft },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.88 },
  section: { paddingVertical: spacing[5], borderTopWidth: 1, borderTopColor: color.border.default, gap: spacing[4], direction: 'rtl' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  sectionCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  sectionEyebrow: { color: color.text.secondary, fontSize: typography.size.caption, lineHeight: 22, textAlign: 'right', writingDirection: 'rtl' },
  sectionTitle: { color: color.brand.navy, fontSize: typography.size.h2, fontWeight: typography.weight.bold, lineHeight: 34, textAlign: 'right', writingDirection: 'rtl' },
  sectionBody: { color: color.text.secondary, fontSize: typography.size.body, lineHeight: 27, textAlign: 'right', writingDirection: 'rtl' },
  sectionImage: { width: 84, height: 84, borderRadius: radius.md },
  objectWrap: { flexGrow: 1, flexBasis: 140 },
  object: { flex: 1, minHeight: 176, borderWidth: 1, borderColor: color.border.default, borderRadius: radius.lg, padding: spacing[3], gap: spacing[2], backgroundColor: color.surface.base, alignItems: 'center' },
  objectSelected: { borderColor: color.brand.navy, backgroundColor: color.brand.goldSoft },
  objectImage: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  objectLabel: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[2] },
  objectTitle: { flexShrink: 1, color: color.brand.navy, fontSize: typography.size.body, fontWeight: typography.weight.bold, lineHeight: 26, textAlign: 'center', writingDirection: 'rtl' },
  objectBody: { color: color.text.secondary, fontSize: typography.size.caption, lineHeight: 22, textAlign: 'center', writingDirection: 'rtl' },
});
