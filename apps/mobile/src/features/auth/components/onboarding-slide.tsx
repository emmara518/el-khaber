/**
 * Onboarding slide — the approved Customer tour composition.
 *
 * Composition (visual source of truth: the approved Splash + Onboarding
 * reference): navy canvas → one large transparent brand artwork as the
 * primary anchor → gold accent → centred title → supporting body →
 * centred progress dots → full-width primary CTA. The Skip action sits in
 * the top corner.
 *
 * It is a real, responsive React Native layout — no rasterised reference,
 * no absolute pixel positions copied from the mock. The artwork keeps its
 * aspect ratio (`contain`), the copy uses the semantic type ladder, and the
 * centred block shrinks its artwork rather than clipping when a small
 * viewport needs the space.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { Image, Pressable, StatusBar, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingDots } from './onboarding-dots';
import { OnboardingSkip } from './onboarding-skip';

import { usePressScale } from '@/ui';
import { Icon } from '@/ui/icon';
import { type } from '@/ui/typography';


const arrival = FadeIn.duration(220).reduceMotion(ReduceMotion.System);

export function OnboardingSlide({
  imageSource,
  imageAspectRatio,
  title,
  body,
  position,
  total = 2,
  actionLabel,
  actionAccessibilityLabel,
  onNext,
  onSkip,
}: {
  imageSource: ImageSourcePropType;
  /** width / height of the artwork, so the stage reserves its true shape. */
  imageAspectRatio: number;
  title: string;
  body: string;
  position: number;
  total?: number;
  actionLabel: string;
  actionAccessibilityLabel: string;
  onNext: () => void;
  onSkip: () => void;
}) {
  const insets = useSafeAreaInsets();
  const press = usePressScale(0.98);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <View
        style={[
          styles.navigation,
          {
            paddingTop: insets.top + spacing[3],
            paddingLeft: insets.left + spacing[5],
            paddingRight: insets.right + spacing[5],
          },
        ]}
      >
        <OnboardingSkip onPress={onSkip} />
      </View>
      <Animated.View
        entering={arrival}
        style={[
          styles.content,
          {
            paddingBottom: insets.bottom + spacing[6],
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <View style={[styles.art, { aspectRatio: imageAspectRatio }]}>
          <Image
            source={imageSource}
            accessible={false}
            importantForAccessibility="no"
            resizeMode="contain"
            style={styles.artImage}
          />
        </View>
        <View style={styles.footer}>
          <View pointerEvents="none" style={styles.accent} />
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          <Text style={styles.body}>{body}</Text>
          <View style={styles.dots}>
            <OnboardingDots position={position} total={total} />
          </View>
          <Animated.View style={press.style}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionAccessibilityLabel}
              onPress={onNext}
              onPressIn={press.onPressIn}
              onPressOut={press.onPressOut}
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
            >
              <Text style={styles.primaryText}>{actionLabel}</Text>
              <Icon name="chevron-left" size={20} color={color.brand.navy} />
            </Pressable>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.brand.navy,
  },
  navigation: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing[6],
    direction: 'rtl',
  },
  art: {
    width: '100%',
    flexShrink: 1,
    paddingHorizontal: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  artImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    alignItems: 'stretch',
    paddingHorizontal: spacing[6],
    direction: 'rtl',
  },
  accent: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.brand.gold,
    alignSelf: 'center',
    marginBottom: spacing[6],
  },
  title: {
    ...type.h1,
    color: color.surface.base,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: spacing[4],
  },
  body: {
    ...type.body,
    color: color.border.default,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  dots: {
    marginTop: spacing[6],
    marginBottom: spacing[6],
  },
  primary: {
    minHeight: 56,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: color.brand.gold,
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  primaryText: {
    ...type.button,
    color: color.brand.navy,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  pressed: {
    opacity: 0.9,
  },
});
