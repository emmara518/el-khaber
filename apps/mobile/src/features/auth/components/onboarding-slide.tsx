import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import {
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingDots } from './onboarding-dots';

const arrival = FadeIn.duration(220).reduceMotion(ReduceMotion.System);
const scrimOpacity = [0.02, 0.04, 0.07, 0.11, 0.17, 0.24, 0.33, 0.43, 0.54, 0.65, 0.75, 0.83, 0.89, 0.94, 0.97, 0.99];

export function OnboardingSlide({
  imageSource,
  imageLabel,
  title,
  body,
  position,
  actionLabel,
  actionAccessibilityLabel,
  onNext,
  onSkip,
  onBack,
}: {
  imageSource: ImageSourcePropType;
  imageLabel: string;
  title: string;
  body: string;
  position: number;
  actionLabel: string;
  actionAccessibilityLabel: string;
  onNext: () => void;
  onSkip: () => void;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function animatePress(pressed: boolean) {
    scale.value = withTiming(pressed ? 0.98 : 1, {
      duration: pressed ? 100 : 150,
      reduceMotion: ReduceMotion.System,
    });
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <Image
        source={imageSource}
        accessibilityLabel={imageLabel}
        accessible={false}
        importantForAccessibility="no"
        resizeMode="cover"
        style={styles.scene}
      />
      <View pointerEvents="none" style={styles.sceneTint} />
      <Animated.View entering={arrival} style={styles.rootContent}>
        <View
          style={[
            styles.navigation,
            {
              paddingTop: insets.top + spacing[2],
              paddingLeft: insets.left + spacing[5],
              paddingRight: insets.right + spacing[5],
            },
          ]}
        >
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="رجوع إلى الجولة التعريفية الأولى"
              onPress={onBack}
              style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
            >
              <Text style={styles.navText}>رجوع</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="تخطي الجولة التعريفية"
            onPress={onSkip}
            style={({ pressed }) => [styles.navButton, styles.skip, pressed && styles.pressed]}
          >
            <Text style={styles.navText}>تخطي</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
        >
          <View style={[styles.sceneSpace, { minHeight: Math.min(260, height * 0.3) }]} />
          <View
            style={[
              styles.panel,
              {
                paddingBottom: insets.bottom + spacing[5],
                paddingLeft: insets.left + spacing[6],
                paddingRight: insets.right + spacing[6],
              },
            ]}
          >
            <View pointerEvents="none" style={styles.scrim}>
              {scrimOpacity.map((opacity) => (
                <View key={opacity} style={[styles.scrimBand, { opacity }]} />
              ))}
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Text style={styles.body}>{body}</Text>
            <View style={styles.footer}>
              <OnboardingDots position={position} total={2} />
              <Animated.View style={pressStyle}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={actionAccessibilityLabel}
                  onPress={onNext}
                  onPressIn={() => animatePress(true)}
                  onPressOut={() => animatePress(false)}
                  style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryText}>{actionLabel}</Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.brand.navy,
  },
  scene: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '82%',
  },
  sceneTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: color.brand.navy,
    opacity: 0.12,
  },
  rootContent: {
    flex: 1,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing[3],
    gap: spacing[3],
  },
  navButton: {
    minHeight: 48,
    minWidth: 64,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: 'rgba(11, 31, 58, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skip: {
    marginStart: 'auto',
  },
  navText: {
    color: color.surface.base,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sceneSpace: {
    flexGrow: 1,
  },
  panel: {
    backgroundColor: color.brand.navy,
    paddingTop: spacing[4],
  },
  scrim: {
    position: 'absolute',
    top: -96,
    left: 0,
    right: 0,
    height: 96,
  },
  scrimBand: {
    flex: 1,
    backgroundColor: color.brand.navy,
  },
  title: {
    color: color.surface.base,
    fontSize: typography.size.h1,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 44,
    marginBottom: spacing[3],
  },
  body: {
    color: color.border.default,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 28,
  },
  footer: {
    marginTop: spacing[6],
  },
  primary: {
    minHeight: 56,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    backgroundColor: color.brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: color.brand.navy,
    fontSize: typography.size.button,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 28,
  },
  pressed: {
    opacity: 0.9,
  },
});
