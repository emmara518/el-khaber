/**
 * Account Type Selection — the Customer role-selection screen
 * (عميل / فني / تاجر), rebuilt to the approved role-selection reference.
 *
 * Composition: EL-KHABIR wordmark + tagline → approved appliance hero →
 * "اختر نوع حسابك" → three adjacent role cards → primary CTA.
 *
 * Business contract is UNCHANGED (docs/03_USER_FLOWS.md §4): the chosen
 * role is only an intent carried into the existing register/login params;
 * it is never treated as the authenticated authority.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROLE_OPTIONS, RoleSelectionCard } from '../src/features/auth/components/role-selection-card';
import { Icon } from '../src/ui/icon';
import { HERO_ASPECT_RATIO, roleSelectionAssets } from '../src/ui/role-selection-assets';
import { fontFamily, type } from '../src/ui/typography';

import type { Role } from '@khabir/shared-types';

export default function AccountTypeRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Role | null>(null);
  const canContinue = selected !== null;

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

  function handleContinue() {
    if (selected !== null) {
      router.push({ pathname: '/register', params: { role: selected } });
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing[5],
            paddingBottom: insets.bottom + spacing[6],
            paddingLeft: insets.left + spacing[6],
            paddingRight: insets.right + spacing[6],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <Text accessibilityRole="header" accessibilityLabel="الخبير" style={styles.wordmark}>
            الخبير
          </Text>
          <Text style={styles.tagline}>صيانة موثوقة لأجهزتك المنزلية</Text>
        </View>

        <View style={styles.hero}>
          <Image
            source={roleSelectionAssets.heroAppliances}
            accessibilityRole="image"
            accessibilityLabel="أجهزة منزلية مع شارة ثقة وأدوات صيانة داخل إطار منزلي ذهبي"
            resizeMode="contain"
            style={styles.heroImage}
          />
        </View>

        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>
            اختر نوع حسابك
          </Text>
          <View pointerEvents="none" style={styles.accent} />
          <Text style={styles.subtitle}>اختر الدور المناسب لك لنقدم لك التجربة الأفضل</Text>
        </View>

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="اختيار نوع الحساب"
          style={styles.roles}
        >
          {ROLE_OPTIONS.map((option) => (
            <RoleSelectionCard
              key={option.role}
              option={option}
              selected={selected === option.role}
              onSelect={setSelected}
            />
          ))}
        </View>

        <View style={styles.spacer} />

        <View style={styles.footer}>
          <Animated.View style={pressStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="متابعة إلى التسجيل"
              accessibilityState={{ disabled: !canContinue }}
              disabled={!canContinue}
              onPress={handleContinue}
              onPressIn={() => animatePress(true)}
              onPressOut={() => animatePress(false)}
              style={({ pressed }) => [
                styles.primary,
                !canContinue && styles.primaryDisabled,
                pressed && canContinue && styles.pressed,
              ]}
            >
              <Text style={[styles.primaryText, !canContinue && styles.primaryTextDisabled]}>
                متابعة
              </Text>
              <Icon
                name="chevron-left"
                size={20}
                color={canContinue ? color.brand.navy : 'rgba(255, 255, 255, 0.45)'}
              />
            </Pressable>
          </Animated.View>

          <View style={styles.loginRow}>
            <Text style={styles.loginHint}>لديك حساب بالفعل؟</Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="تسجيل الدخول"
              onPress={() =>
                router.push({
                  pathname: '/login',
                  params: selected !== null ? { role: selected } : undefined,
                })
              }
              style={({ pressed }) => [styles.loginLink, pressed && styles.pressed]}
            >
              <Text style={styles.loginLinkText}>تسجيل الدخول</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.brand.navy,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    direction: 'rtl',
    gap: spacing[4],
  },
  brand: {
    alignItems: 'center',
  },
  wordmark: {
    ...type.display,
    fontSize: 30,
    lineHeight: 42,
    color: color.surface.base,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  tagline: {
    ...type.caption,
    color: color.brand.goldSoft,
    textAlign: 'center',
    writingDirection: 'rtl',
    marginTop: spacing[1],
  },
  hero: {
    width: '100%',
    aspectRatio: HERO_ASPECT_RATIO,
    maxHeight: 220,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heading: {
    alignItems: 'center',
  },
  title: {
    ...type.h1,
    color: color.surface.base,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  accent: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.brand.gold,
    marginTop: spacing[3],
    marginBottom: spacing[3],
  },
  subtitle: {
    ...type.body,
    color: 'rgba(255, 255, 255, 0.72)',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  roles: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'stretch',
    gap: spacing[2],
  },
  spacer: {
    flex: 1,
    minHeight: spacing[5],
  },
  footer: {
    gap: spacing[4],
  },
  primary: {
    minHeight: 56,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: color.brand.gold,
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  primaryDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  primaryText: {
    ...type.button,
    color: color.brand.navy,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  primaryTextDisabled: {
    color: 'rgba(255, 255, 255, 0.45)',
  },
  pressed: {
    opacity: 0.9,
  },
  loginRow: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  loginHint: {
    ...type.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    writingDirection: 'rtl',
  },
  loginLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  loginLinkText: {
    ...type.caption,
    fontFamily: fontFamily.semibold,
    color: color.brand.gold,
    writingDirection: 'rtl',
  },
});
