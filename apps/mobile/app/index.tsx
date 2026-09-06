/**
 * Splash / Bootstrap route.
 *
 * Identity + polished loading state only — no product logic. The
 * root `AuthGate` owns session bootstrap and role redirects; this
 * screen is the visual state shown while `status === 'unknown'`.
 */

import { color, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthStore } from '../src/lib/auth-store';

export default function SplashRoute() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/onboarding-1');
    }
    // `authenticated` transitions are owned by the root AuthGate
    // (role-resolved home); Splash only advances the anonymous path.
  }, [status, router]);
  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={styles.center}>
          <Text accessibilityRole="header" accessibilityLabel="الخبير" style={styles.brand}>
            الخبير
          </Text>
          <Text style={styles.tagline}>صيانة موثوقة لأجهزتك المنزلية</Text>
          <ActivityIndicator
            accessibilityLabel="جارٍ تجهيز التطبيق"
            color={color.brand.gold}
            size="large"
            style={styles.loader}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.brand.navy,
  },
  safe: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  brand: {
    color: color.surface.base,
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  tagline: {
    color: color.brand.goldSoft,
    fontSize: typography.size.body,
    marginTop: spacing[3],
    textAlign: 'center',
  },
  loader: {
    marginTop: spacing[8],
  },
});
