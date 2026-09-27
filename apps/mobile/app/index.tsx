/**
 * Splash / Bootstrap route.
 *
 * Identity + polished branded loading state only — no product logic. The
 * root `AuthGate` owns session bootstrap and role redirects; this screen is
 * the visual state shown while `status === 'unknown'`.
 *
 * Composition follows the approved Splash reference: navy canvas, the
 * approved brand artwork as the primary anchor, an intentional lower-area
 * loading treatment (branded progress track + restrained caption). The
 * brand wordmark is supplied by the approved artwork, so no display text
 * is duplicated on top of it.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OnboardingSkip } from '../src/features/auth/components/onboarding-skip';
import { useAuthStore } from '../src/lib/auth-store';
import { onboardingAssets } from '../src/ui/onboarding-assets';
import { type } from '../src/ui/typography';

const SWEEP = 1300;

export default function SplashRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const [trackWidth, setTrackWidth] = useState(0);

  const progress = useSharedValue(0);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/onboarding-1');
    }
    // `authenticated` transitions are owned by the root AuthGate
    // (role-resolved home); Splash only advances the anonymous path.
  }, [status, router]);

  useEffect(() => {
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: SWEEP,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      false,
    );
  }, [progress]);

  const segmentWidth = trackWidth * 0.38;
  const segmentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -segmentWidth + progress.value * (trackWidth + segmentWidth) }],
  }));

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
        <OnboardingSkip onPress={() => router.replace('/account-type')} />
      </View>
      <View style={styles.stage}>
        <Image
          source={onboardingAssets.splash}
          accessible
          accessibilityLabel="شعار الخبير — صيانة موثوقة لأجهزتك المنزلية"
          resizeMode="contain"
          style={styles.brand}
        />
      </View>
      <View style={[styles.loading, { paddingBottom: insets.bottom + spacing[10] }]}>
        <View
          accessible={false}
          importantForAccessibility="no"
          style={styles.track}
          onLayout={(event) => {
            setTrackWidth(event.nativeEvent.layout.width);
          }}
        >
          {trackWidth > 0 ? (
            <Animated.View style={[styles.segment, { width: segmentWidth }, segmentStyle]} />
          ) : null}
        </View>
        <Text style={styles.caption}>جارٍ التهيئة…</Text>
      </View>
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
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
  },
  brand: {
    width: '100%',
    height: '100%',
  },
  loading: {
    alignItems: 'center',
    paddingTop: spacing[4],
    paddingHorizontal: spacing[6],
  },
  track: {
    width: '72%',
    maxWidth: 260,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
  },
  segment: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: color.brand.gold,
  },
  caption: {
    ...type.caption,
    color: color.border.default,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: spacing[3],
  },
});
