/**
 * Onboarding 2 — specialization + discovery + trust.
 * Explanatory only, then into account-type selection.
 */

import { color, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingSlide } from '../src/features/auth/components/onboarding-slide';

export default function OnboardingTwoRoute() {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="رجوع إلى الجولة التعريفية الأولى"
          onPress={() => router.back()}
          style={styles.nav}
        >
          <Text style={styles.navText}>رجوع</Text>
        </Pressable>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="تخطي الجولة التعريفية"
          onPress={() => router.replace('/account-type')}
          style={styles.nav}
        >
          <Text style={styles.navText}>تخطي</Text>
        </Pressable>
      </View>
      <View style={styles.slide}>
        <OnboardingSlide
          visual="❄️"
          visualLabel="أجهزة منزلية: غسالة وثلاجة وتكييف"
          title="اعثر على الفني المناسب بثقة"
          body="اكتشف فنيين متخصصين حسب جهازك ومشكلتك، مع تقييمات حقيقية ومتابعة للطلب."
        />
      </View>
      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="متابعة إلى اختيار نوع الحساب"
          onPress={() => router.push('/account-type')}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>متابعة</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
  },
  nav: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: {
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
