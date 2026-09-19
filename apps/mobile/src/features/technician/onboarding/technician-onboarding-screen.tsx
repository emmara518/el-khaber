/**
 * Technician onboarding screen (T-B) — 6 steps + submission.
 *
 * info (name/phone/bio/experience) → specialty → appliances →
 * services → areas → review → submit → pending result. Shared
 * `LabeledInput`/`MultiSelectChips` with the profile edit form.
 * Submission claims only "sent for review".
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LabeledInput, MultiSelectChips } from '../profile/components/profile-selectors';
import {
  APPLIANCE_OPTIONS,
  AREA_OPTIONS,
  SERVICE_OPTIONS,
  SPECIALTY_OPTIONS,
  type TechnicianProfileDataSource,
  type TechnicianProfileDraft,
} from '../profile/technician-profile-types';

import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from './technician-onboarding-machine';
import { useTechnicianOnboardingViewModel } from './use-technician-onboarding-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { Card, Icon, SectionHeader } from '@/ui';

const STEP_TITLES: Record<OnboardingStep, string> = {
  info: 'البيانات الأساسية',
  specialty: 'التخصص المهني',
  appliances: 'تغطية الأجهزة',
  services: 'الخدمات',
  areas: 'مناطق الخدمة',
  review: 'المراجعة والإرسال',
};

export default function TechnicianOnboardingScreen({
  initialDraft,
  source,
  onSubmitted,
}: {
  initialDraft?: TechnicianProfileDraft;
  source?: TechnicianProfileDataSource;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const vm = useTechnicianOnboardingViewModel(initialDraft, source);
  const { step, draft, fieldErrors, stepError } = vm.machine;
  const index = ONBOARDING_STEPS.indexOf(step);

  if (vm.submitStatus === 'submitted' && vm.submitted !== null) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card background={color.success.soft} borderColor={color.success.DEFAULT} padded style={styles.center}>
          <View style={styles.successBadge}><Icon name="clock" size={26} color={color.brand.navy} accessibilityLabel="قيد المراجعة" /></View>
          <Text accessibilityRole="header" style={styles.successTitle}>
            تم إرسال البيانات للمراجعة
          </Text>
          <Text style={styles.muted}>
            سنراجع بياناتك وسنعلمك بالنتيجة. يمكنك متابعة حالة التوثيق من ملفك الشخصي.
          </Text>
        </Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="الذهاب إلى الملف الشخصي"
          onPress={() => {
            onSubmitted?.();
            router.replace('/(technician)/profile');
          }}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>الذهاب إلى الملف الشخصي</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        إكمال ملف الفني
      </Text>
      <Text
        accessibilityRole="text"
        accessibilityLabel={`الخطوة ${index + 1} من ${ONBOARDING_STEPS.length}: ${STEP_TITLES[step]}`}
        style={styles.stepLabel}
      >
        الخطوة {index + 1} من {ONBOARDING_STEPS.length}: {STEP_TITLES[step]}
      </Text>
      <View style={styles.dots}>
        {ONBOARDING_STEPS.map((s, i) => (
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

      {step === 'info' ? (
        <View style={styles.section}>
          <LabeledInput
            label="الاسم المعروض"
            value={draft.displayNameAr}
            onChange={(text) => vm.dispatch({ type: 'SET_TEXT', field: 'displayNameAr', text })}
            error={fieldErrors.displayNameAr}
            placeholder="مثال: سامي محيور"
          />
          <LabeledInput
            label="رقم الهاتف"
            value={draft.phoneAr}
            onChange={(text) => vm.dispatch({ type: 'SET_TEXT', field: 'phoneAr', text })}
            error={fieldErrors.phoneAr}
            placeholder="05xxxxxxxx"
            keyboardType="phone-pad"
          />
          <LabeledInput
            label="نبذة مختصرة (اختياري)"
            value={draft.bioAr}
            onChange={(text) => vm.dispatch({ type: 'SET_TEXT', field: 'bioAr', text })}
            placeholder="تخصصك وخبرتك باختصار…"
            multiline
          />
          <LabeledInput
            label="سنوات الخبرة (اختياري)"
            value={draft.experienceYears === null ? '' : String(draft.experienceYears)}
            onChange={(text) => {
              const n = Number(text.replace(/[^0-9]/g, ''));
              vm.dispatch({ type: 'SET_EXPERIENCE', years: text.trim().length === 0 ? null : n });
            }}
            error={fieldErrors.experienceYears}
            placeholder="مثال: ٨"
            keyboardType="numeric"
          />
        </View>
      ) : null}

      {step === 'specialty' ? (
        <MultiSelectChips
          label="اختر تخصصك"
          options={SPECIALTY_OPTIONS}
          selected={draft.specialtiesAr}
          onToggle={(value) => vm.dispatch({ type: 'TOGGLE_SPECIALTY', value })}
          error={fieldErrors.specialtiesAr}
        />
      ) : null}

      {step === 'appliances' ? (
        <MultiSelectChips
          label="الأجهزة التي تخدمها"
          options={APPLIANCE_OPTIONS.map((a) => a.titleAr)}
          selected={draft.appliances.map((slug) => APPLIANCE_OPTIONS.find((a) => a.slug === slug)?.titleAr ?? slug)}
          onToggle={(title) => {
            const found = APPLIANCE_OPTIONS.find((a) => a.titleAr === title);
            if (found) vm.dispatch({ type: 'TOGGLE_APPLIANCE', value: found.slug });
          }}
          error={fieldErrors.appliances}
        />
      ) : null}

      {step === 'services' ? (
        <MultiSelectChips
          label="الخدمات التي تقدمها"
          options={SERVICE_OPTIONS}
          selected={draft.servicesAr}
          onToggle={(value) => vm.dispatch({ type: 'TOGGLE_SERVICE', value })}
          error={fieldErrors.servicesAr}
        />
      ) : null}

      {step === 'areas' ? (
        <MultiSelectChips
          label="مناطق الخدمة"
          options={AREA_OPTIONS}
          selected={draft.areasAr}
          onToggle={(value) => vm.dispatch({ type: 'TOGGLE_AREA', value })}
          error={fieldErrors.areasAr}
        />
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
  draft: TechnicianProfileDraft;
  onGoto: (step: OnboardingStep) => void;
  submitStatus: 'idle' | 'submitting' | 'submitted' | 'error';
  submitError: string | null;
  onSubmit: () => void;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const rows: ReadonlyArray<{ key: string; label: string; value: string; step: OnboardingStep }> = [
    { key: 'name', label: 'الاسم', value: draft.displayNameAr || '—', step: 'info' },
    { key: 'phone', label: 'الهاتف', value: draft.phoneAr || '—', step: 'info' },
    {
      key: 'exp',
      label: 'الخبرة',
      value: draft.experienceYears === null ? '—' : `${draft.experienceYears} سنوات`,
      step: 'info',
    },
    { key: 'spec', label: 'التخصص', value: draft.specialtiesAr.join('، ') || '—', step: 'specialty' },
    {
      key: 'app',
      label: 'الأجهزة',
      value:
        draft.appliances
          .map((slug) => APPLIANCE_OPTIONS.find((a) => a.slug === slug)?.titleAr ?? slug)
          .join('، ') || '—',
      step: 'appliances',
    },
    { key: 'srv', label: 'الخدمات', value: draft.servicesAr.join('، ') || '—', step: 'services' },
    { key: 'areas', label: 'المناطق', value: draft.areasAr.join('، ') || '—', step: 'areas' },
  ];
  const submitting = submitStatus === 'submitting';
  return (
    <View>
      <SectionHeader titleKey="tech.onboarding.review" />
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
          accessibilityLabel="إعادة إرسال البيانات"
          onPress={onRetry}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>إعادة الإرسال</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إرسال البيانات للمراجعة"
          accessibilityState={{ disabled: submitting, busy: submitting }}
          onPress={onSubmit}
          disabled={submitting}
          style={({ pressed }) => [styles.primary, submitting && styles.disabled, pressed && !submitting && styles.pressed]}
        >
          {submitting ? (
            <ActivityIndicator accessibilityLabel="جارٍ إرسال البيانات" color={color.surface.base} />
          ) : (
            <Text style={styles.primaryText}>إرسال البيانات للمراجعة</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
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
    gap: spacing[4],
    marginTop: spacing[4],
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
