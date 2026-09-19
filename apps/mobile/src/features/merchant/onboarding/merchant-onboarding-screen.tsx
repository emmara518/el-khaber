/**
 * Merchant onboarding screen (M-B) — 4 steps + submission.
 *
 * identity (store name/city) → business (bio, optional) → contact
 * (phone) → review → submit → pending result. Only documented
 * fields (docs/06 §5); bio is optional (nullable in schema). No
 * KYC/tax/registration fields exist — none are collected.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  MERCHANT_CITY_OPTIONS,
  type MerchantProfileDataSource,
  type MerchantProfileDraft,
} from '../profile/merchant-profile-types';

import {
  MERCHANT_ONBOARDING_STEPS,
  type MerchantOnboardingStep,
} from './merchant-onboarding-machine';
import { useMerchantOnboardingViewModel } from './use-merchant-onboarding-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { Card, Icon, SectionHeader } from '@/ui';
import { SceneHero } from '@/ui/cinematic';
import { sceneAssets } from '@/ui/scene-assets';

const STEP_TITLES: Record<MerchantOnboardingStep, string> = {
  identity: 'هوية المتجر',
  business: 'نبذة المتجر',
  contact: 'بيانات التواصل',
  review: 'المراجعة والإرسال',
};

export default function MerchantOnboardingScreen({
  initialDraft,
  source,
}: {
  initialDraft?: MerchantProfileDraft;
  source?: MerchantProfileDataSource;
}) {
  const router = useRouter();
  const vm = useMerchantOnboardingViewModel(initialDraft, source);
  const { step, draft, fieldErrors, stepError } = vm.machine;
  const index = MERCHANT_ONBOARDING_STEPS.indexOf(step);

  if (vm.submitStatus === 'submitted' && vm.submitted !== null) {
    return (
      <ScrollView contentContainerStyle={[styles.content, styles.padded]}>
        <Image
          source={sceneAssets.merchant_success}
          accessible={false}
          importantForAccessibility="no"
          resizeMode="cover"
          style={styles.successScene}
        />
        <Card background={color.success.soft} borderColor={color.success.DEFAULT} padded style={styles.center}>
          <View style={styles.successBadge}><Icon name="clock" size={26} color={color.brand.navy} accessibilityLabel="قيد المراجعة" /></View>
          <Text accessibilityRole="header" style={styles.successTitle}>
            تم إرسال بيانات المتجر للمراجعة
          </Text>
          <Text style={styles.muted}>
            سنراجع بيانات متجرك وسنعلمك بالنتيجة. يمكنك متابعة حالة التوثيق من إعدادات متجرك.
          </Text>
        </Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الذهاب إلى ملف المتجر"
          onPress={() => router.replace('/(merchant)/profile')}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>الذهاب إلى ملف المتجر</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SceneHero
        compact
        asset="merchant_dashboard_hero"
        eyebrow="إعداد المتجر"
        title="إكمال ملف المتجر"
        body={`الخطوة ${index + 1} من ${MERCHANT_ONBOARDING_STEPS.length}: ${STEP_TITLES[step]}`}
      />
      <View style={styles.editorial}>
      <Text
        accessibilityRole="text"
        accessibilityLabel={`الخطوة ${index + 1} من ${MERCHANT_ONBOARDING_STEPS.length}: ${STEP_TITLES[step]}`}
        style={styles.stepLabel}
      >
        الخطوة {index + 1} من {MERCHANT_ONBOARDING_STEPS.length}: {STEP_TITLES[step]}
      </Text>
      <View style={styles.dots}>
        {MERCHANT_ONBOARDING_STEPS.map((s, i) => (
          <View
            key={s}
            style={[styles.dot, i < index && styles.dotDone, i === index && styles.dotCurrent]}
          >
            {i < index ? <Icon name="check" size={13} color={color.surface.base} /> : null}
          </View>
        ))}
      </View>

      {stepError !== null ? (
        <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${stepError}`} style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{stepError}</Text>
        </View>
      ) : null}

      {step === 'identity' ? (
        <View style={styles.section}>
          <Text style={styles.label}>اسم المتجر</Text>
          <TextInput
            accessibilityLabel={fieldErrors.businessNameAr ? 'اسم المتجر. خطأ: أدخل اسم المتجر (حرفان على الأقل)' : 'اسم المتجر'}
            placeholder="مثال: مكتبة الخبير للأجهزة"
            placeholderTextColor={color.text.secondary}
            value={draft.businessNameAr}
            onChangeText={(text) => vm.dispatch({ type: 'SET_TEXT', field: 'businessNameAr', text })}
            style={[styles.input, fieldErrors.businessNameAr ? styles.inputError : null]}
            textAlign="right"
          />
          {fieldErrors.businessNameAr ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>
              {fieldErrors.businessNameAr}
            </Text>
          ) : null}
          <Text style={styles.label}>مدينة المتجر</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="اختيار مدينة المتجر" style={styles.cities}>
            {MERCHANT_CITY_OPTIONS.map((city) => {
              const selected = draft.cityAr === city;
              return (
                <Pressable
                  key={city}
                  accessibilityRole="radio"
                  accessibilityLabel={`المدينة: ${city}${selected ? '، محددة حاليًا' : ''}`}
                  accessibilityState={{ selected, checked: selected }}
                  onPress={() => vm.dispatch({ type: 'SET_TEXT', field: 'cityAr', text: city })}
                  style={({ pressed }) => [
                    styles.cityChip,
                    selected && styles.cityChipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  {selected ? <Icon name="check" size={14} color={color.brand.navy} /> : null}
                  <Text style={[styles.cityText, selected && styles.cityTextSelected]}>
                    {city}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.cityAr ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>
              {fieldErrors.cityAr}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 'business' ? (
        <View style={styles.section}>
          <SectionHeader titleKey="merchant.onboarding.bio" />
          <TextInput
            accessibilityLabel="نبذة عن المتجر، اختياري"
            placeholder="تخصص متجرك وما يقدمه للعملاء…"
            placeholderTextColor={color.text.secondary}
            value={draft.bioAr}
            onChangeText={(text) => vm.dispatch({ type: 'SET_TEXT', field: 'bioAr', text })}
            style={[styles.input, styles.multiline]}
            textAlign="right"
            multiline
            numberOfLines={4}
          />
          <Text style={styles.optional}>اختياري</Text>
        </View>
      ) : null}

      {step === 'contact' ? (
        <View style={styles.section}>
          <Text style={styles.label}>رقم هاتف المتجر</Text>
          <TextInput
            accessibilityLabel={fieldErrors.phoneAr ? 'رقم هاتف المتجر. خطأ: رقم الهاتف يجب أن يكون من ٧ إلى ١٥ رقمًا' : 'رقم هاتف المتجر'}
            placeholder="05xxxxxxxx"
            placeholderTextColor={color.text.secondary}
            value={draft.phoneAr}
            onChangeText={(text) => vm.dispatch({ type: 'SET_TEXT', field: 'phoneAr', text })}
            keyboardType="phone-pad"
            style={[styles.input, fieldErrors.phoneAr ? styles.inputError : null]}
            textAlign="right"
          />
          {fieldErrors.phoneAr ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>
              {fieldErrors.phoneAr}
            </Text>
          ) : null}
        </View>
      ) : null}

      {step === 'review' ? (
        <ReviewSummary
          draft={draft}
          onGoto={(target) => vm.dispatch({ type: 'GOTO', step: target })}
          submitStatus={vm.submitStatus}
          submitError={vm.submitError}
          onSubmit={vm.submit}
          onRetry={() => {
            vm.retrySubmit();
            vm.submit();
          }}
        />
      ) : null}

      {step !== 'review' ? (
        <View style={styles.nav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => vm.dispatch({ type: 'BACK' })}
            disabled={index === 0}
            style={({ pressed }) => [styles.navBtn, index === 0 && styles.disabled, pressed && styles.pressed]}
          >
            <Icon name="corner-up-right" size={16} color={color.brand.navy} /><Text style={styles.navBtnText}>رجوع</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="التالي"
            onPress={() => vm.dispatch({ type: 'NEXT' })}
            style={({ pressed }) => [styles.navPrimary, pressed && styles.pressed]}
          >
            <Text style={styles.navPrimaryText}>التالي</Text><Icon name="chevron-left" size={16} color={color.surface.base} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
  );
}

function ReviewSummary({
  draft,
  onGoto,
  submitStatus,
  submitError,
  onSubmit,
  onRetry,
}: {
  draft: MerchantProfileDraft;
  onGoto: (step: MerchantOnboardingStep) => void;
  submitStatus: 'idle' | 'submitting' | 'submitted' | 'error';
  submitError: string | null;
  onSubmit: () => void;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const rows: ReadonlyArray<{ key: string; label: string; value: string; step: MerchantOnboardingStep }> = [
    { key: 'name', label: 'اسم المتجر', value: draft.businessNameAr || '—', step: 'identity' },
    { key: 'city', label: 'المدينة', value: draft.cityAr || '—', step: 'identity' },
    { key: 'bio', label: 'النبذة', value: draft.bioAr || '—', step: 'business' },
    { key: 'phone', label: 'الهاتف', value: draft.phoneAr || '—', step: 'contact' },
  ];
  const submitting = submitStatus === 'submitting';
  return (
    <View>
      <SectionHeader titleKey="merchant.onboarding.review" />
      <Card background={color.surface.base} padded style={styles.review}>
        {rows.map((row) => (
          <View key={row.key} style={styles.reviewRow}>
            <View style={styles.reviewText}>
              <Text style={styles.reviewLabel}>{row.label}</Text>
              <Text style={styles.reviewValue}>{row.value}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`تعديل ${row.label}`}
              onPress={() => onGoto(row.step)}
              style={styles.reviewEdit}
            >
              <Text style={styles.reviewEditText}>{t('request.edit')}</Text>
            </Pressable>
          </View>
        ))}
      </Card>
      {submitStatus === 'error' ? (
        <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${submitError ?? ''}`} style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{submitError}</Text>
        </View>
      ) : null}
      {submitStatus === 'error' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إعادة إرسال بيانات المتجر"
          onPress={onRetry}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>إعادة الإرسال</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إرسال بيانات المتجر للمراجعة"
          accessibilityState={{ disabled: submitting, busy: submitting }}
          onPress={onSubmit}
          disabled={submitting}
          style={({ pressed }) => [styles.primary, submitting && styles.disabled, pressed && !submitting && styles.pressed]}
        >
          {submitting ? (
            <ActivityIndicator accessibilityLabel="جارٍ إرسال بيانات المتجر" color={color.surface.base} />
          ) : (
            <Text style={styles.primaryText}>إرسال بيانات المتجر للمراجعة</Text>
          )}
        </Pressable>
      )}
      </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing[8],
  },
  padded: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
  },
  editorial: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
  },
  successScene: {
    width: '100%',
    height: 160,
    borderRadius: radius.lg,
    backgroundColor: color.brand.navyDeep,
    marginBottom: spacing[4],
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  stepLabel: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    marginTop: spacing[2],
    textAlign: 'right',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing[1],
    marginTop: spacing[3],
    justifyContent: 'center',
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    borderColor: color.brand.navy,
    backgroundColor: color.brand.navy,
  },
  dotCurrent: {
    borderColor: color.brand.navy,
    backgroundColor: color.brand.gold,
  },
  section: {
    gap: spacing[2],
    marginTop: spacing[4],
  },
  label: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: spacing[2],
  },
  input: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    color: color.text.primary,
    fontSize: typography.size.body,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: color.error.DEFAULT,
  },
  fieldError: {
    color: color.error.DEFAULT,
    fontSize: typography.size.caption,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  optional: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    textAlign: 'right',
  },
  cities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  cityChip: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[1] + 2,
  },
  cityChipSelected: {
    borderColor: color.brand.navy,
    borderWidth: 2,
    backgroundColor: color.surface.base,
  },
  cityText: {
    color: color.text.secondary,
    fontSize: typography.size.body,
  },
  cityTextSelected: {
    color: color.text.primary,
    fontWeight: typography.weight.bold,
  },
  inlineError: {
    backgroundColor: color.error.soft,
    borderWidth: 1,
    borderColor: color.error.DEFAULT,
    borderRadius: radius.md,
    padding: spacing[3],
    marginTop: spacing[3],
  },
  inlineErrorText: {
    color: color.error.DEFAULT,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  nav: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  navBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[1] + 2,
  },
  navBtnText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  navPrimary: {
    flex: 2,
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing[1] + 2,
  },
  navPrimaryText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.8,
  },
  review: {
    marginTop: spacing[3],
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: color.border.default,
    gap: spacing[2],
  },
  reviewText: {
    flex: 1,
  },
  reviewLabel: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    textAlign: 'right',
  },
  reviewValue: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  reviewEdit: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  reviewEditText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  primary: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  primaryText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  center: {
    alignItems: 'center',
    gap: spacing[2],
  },
  successBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  muted: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
