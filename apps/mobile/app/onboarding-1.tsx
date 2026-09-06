/**
 * Onboarding 1 — value proposition: trusted appliance service.
 * Explanatory only (docs/03_USER_FLOWS.md §3).
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingSlide } from '../src/features/auth/components/onboarding-slide';

export default function OnboardingOneRoute() {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="تخطي الجولة التعريفية"
          onPress={() => router.replace('/account-type')}
          style={styles.skip}
        >
          <Text style={styles.skipText}>تخطي</Text>
        </Pressable>
      </View>
      <View style={styles.slide}>
        <OnboardingSlide
          visual="🛠️"
          visualLabel="فني يصلح جهازًا منزليًا"
          title="الخبير لصيانة الأجهزة المنزلية"
          body="خدمة موثوقة لغسالاتك وثلاجاتك وتكييفاتك، بفنيين معتمدين وضمان واضح."
        />
      </View>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="التالي إلى الجولة التعريفية الثانية"
          onPress={() => router.push('/onboarding-2')}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>التالي</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.base,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
  },
  skip: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    color: color.text.secondary,
    fontSize: 15,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  footer: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[6],
  },
  primary: {
    backgroundColor: color.brand.navy,
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: color.surface.base,
    fontSize: 16,
    fontWeight: '600',
  },
});
