/**
 * Customer Fault Guide screen (Batch B) — the full flow:
 * appliance → symptom → loading → result / no-match / error.
 *
 * Reuses `ApplianceIcon`, `Card`, `SectionHeader`, `Pill`, the shared
 * list states, and the design tokens so the guide reads as part of
 * Customer Home. Results separate العرض / الأسباب المحتملة /
 * إرشادات آمنة / ماذا تفعل الآن؟ and end with the "ابحث عن فني"
 * CTA (deferred to the typed Batch-C entry — no dead interaction).
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListEmpty, ListError, ListLoading } from '../components/list-state-view';

import {
  symptomsForAppliance,
  type FaultAppliance,
  type FaultDetail,
  type FaultSymptom,
} from './fault-guide-types';
import { FaultProgressIndicator } from './fault-progress-indicator';
import { useFaultGuideViewModel } from './use-fault-guide-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { ApplianceIcon, Card, SectionHeader } from '@/ui';

export default function FaultGuideScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useFaultGuideViewModel();

  if (vm.loadStatus === 'loading') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <GuideHeading title={t('maintenance.title')} subtitle={t('maintenance.subtitle')} />
        <ListLoading label={t('state.loading')} />
      </ScrollView>
    );
  }

  if (vm.loadStatus === 'error' || vm.data === null) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <GuideHeading title={t('maintenance.title')} subtitle={t('maintenance.subtitle')} />
        <ListError
          title={t('fault.error.title')}
          message={vm.loadError?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={vm.reload}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <GuideHeading title={t('maintenance.title')} subtitle={t('maintenance.subtitle')} />

      {vm.step === 'APPLIANCE' ? (
        <>
          <FaultProgressIndicator position={0} />
          <SectionHeader titleKey="fault.chooseAppliance" />
          <View accessibilityRole="radiogroup" accessibilityLabel={t('fault.chooseAppliance')} style={styles.appliances}>
            {vm.data.appliances.map((appliance) => (
              <ApplianceChoice
                key={appliance.slug}
                appliance={appliance}
                onSelect={() => vm.selectAppliance(appliance.slug)}
              />
            ))}
          </View>
        </>
      ) : null}

      {vm.step === 'SYMPTOM' && vm.appliance !== null ? (
        <SymptomStep
          appliances={vm.data.appliances}
          symptoms={symptomsForAppliance(vm.data.symptoms, vm.appliance)}
          applianceSlug={vm.appliance}
          onSelect={vm.selectSymptom}
          onBack={vm.back}
          onRestart={vm.restart}
        />
      ) : null}

      {vm.step === 'LOADING' ? (
        <>
          <FaultProgressIndicator position={2} />
          <ListLoading label={t('fault.resolving')} />
        </>
      ) : null}

      {vm.step === 'RESULT' && vm.detail !== null ? (
        <ResultStep
          detail={vm.detail}
          symptomTitle={vm.data.symptoms.find((s) => s.id === vm.symptomId)?.titleAr ?? ''}
          onFindTechnician={() =>
            router.push({ pathname: '/(customer)/find-technician', params: { symptomId: vm.symptomId ?? '' } })
          }
          onBack={vm.back}
          onRestart={vm.restart}
        />
      ) : null}

      {vm.step === 'NO_MATCH' ? (
        <>
          <FaultProgressIndicator position={2} />
          <ListEmpty
            icon="🔍"
            iconLabel="لا توجد نتيجة مطابقة"
            title={t('fault.noMatch.title')}
            body={t('fault.noMatch.body')}
            actionLabel={t('fault.findTechnician')}
            onAction={() =>
              router.push({ pathname: '/(customer)/find-technician', params: { symptomId: vm.symptomId ?? '' } })
            }
          />
          <StepNav onBack={vm.back} onRestart={vm.restart} backLabel={t('fault.back')} restartLabel={t('fault.restart')} />
        </>
      ) : null}

      {vm.step === 'ERROR' ? (
        <>
          <FaultProgressIndicator position={2} />
          <ListError
            title={t('fault.error.title')}
            message={t('fault.error.body')}
            retryLabel={t('state.retry')}
            onRetry={vm.retryResolve}
          />
          <StepNav onBack={vm.back} onRestart={vm.restart} backLabel={t('fault.back')} restartLabel={t('fault.restart')} />
        </>
      ) : null}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function GuideHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.disclaimer}>دليل استرشادي فقط — وليس تشخيصًا فنيًا معتمدًا.</Text>
    </View>
  );
}

function ApplianceChoice({
  appliance,
  onSelect,
}: {
  appliance: FaultAppliance;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`الجهاز: ${appliance.titleAr}. ${appliance.taglineAr}`}
      onPress={onSelect}
      style={({ pressed }) => [styles.choice, pressed && styles.pressed]}
    >
      <ApplianceIcon slug={appliance.slug} size={64} />
      <Text style={styles.choiceTitle}>{appliance.titleAr}</Text>
      <Text style={styles.choiceTagline}>{appliance.taglineAr}</Text>
      <Text style={styles.choiceCta}>اختر ‹</Text>
    </Pressable>
  );
}

function SymptomStep({
  appliances,
  symptoms,
  applianceSlug,
  onSelect,
  onBack,
  onRestart,
}: {
  appliances: ReadonlyArray<FaultAppliance>;
  symptoms: ReadonlyArray<FaultSymptom>;
  applianceSlug: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  onRestart: () => void;
}) {
  const { t } = useI18n();
  const appliance = appliances.find((a) => a.slug === applianceSlug);
  return (
    <>
      <FaultProgressIndicator position={1} />
      <Card background={color.brand.navy} borderColor={color.brand.navy} padded style={styles.recap}>
        <Text style={styles.recapText}>الجهاز المختار: {appliance?.titleAr ?? ''}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="تغيير الجهاز" onPress={onBack} style={styles.recapBtn}>
          <Text style={styles.recapBtnText}>تغيير</Text>
        </Pressable>
      </Card>
      <SectionHeader titleKey="fault.chooseSymptom" />
      <View style={styles.symptoms}>
        {symptoms.map((symptom) => (
          <Pressable
            key={symptom.id}
            accessibilityRole="button"
            accessibilityLabel={`العرض: ${symptom.titleAr}${symptom.frequencyAr ? `. ${symptom.frequencyAr}` : ''}`}
            onPress={() => onSelect(symptom.id)}
            style={({ pressed }) => [styles.symptom, pressed && styles.pressed]}
          >
            <View style={styles.symptomText}>
              <Text style={styles.symptomTitle}>{symptom.titleAr}</Text>
              {symptom.frequencyAr ? <Text style={styles.symptomFreq}>{symptom.frequencyAr}</Text> : null}
            </View>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
        ))}
      </View>
      <StepNav onBack={onBack} onRestart={onRestart} backLabel={t('fault.back')} restartLabel={t('fault.restart')} />
    </>
  );
}

function ResultStep({
  detail,
  symptomTitle,
  onFindTechnician,
  onBack,
  onRestart,
}: {
  detail: FaultDetail;
  symptomTitle: string;
  onFindTechnician: () => void;
  onBack: () => void;
  onRestart: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <FaultProgressIndicator position={2} />
      <Card background={color.surface.base} padded style={styles.result}>
        <Text style={styles.sectionLabel}>العرض</Text>
        <Text style={styles.symptomResult}>{symptomTitle}</Text>
      </Card>
      <Card background={color.surface.base} padded style={styles.result}>
        <Text style={styles.sectionLabel}>الأسباب المحتملة</Text>
        {detail.possibleCausesAr.map((cause) => (
          <Text key={cause} style={styles.bullet}>
            • {cause}
          </Text>
        ))}
      </Card>
      <Card background={color.surface.base} padded style={styles.result}>
        <Text style={styles.sectionLabel}>إرشادات آمنة</Text>
        {detail.safeStepsAr.map((step, index) => (
          <View key={step} style={styles.safeRow}>
            <View style={styles.safeNumber}>
              <Text style={styles.safeNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.safeText}>{step}</Text>
          </View>
        ))}
      </Card>
      {detail.warningAr !== null ? (
        <Card background={color.error.soft} borderColor={color.error.DEFAULT} padded style={styles.result}>
          <Text accessibilityRole="alert" style={styles.warning}>
            ⚠️ {detail.warningAr}
          </Text>
        </Card>
      ) : null}
      <Card background={color.brand.goldSoft} borderColor={color.brand.gold} padded style={styles.result}>
        <Text style={styles.sectionLabel}>ماذا تفعل الآن؟</Text>
        <Text style={styles.action}>{detail.actionAr}</Text>
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('fault.findTechnician')}
        onPress={onFindTechnician}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text style={styles.ctaText}>{t('fault.findTechnician')}</Text>
      </Pressable>
      <StepNav onBack={onBack} onRestart={onRestart} backLabel={t('fault.back')} restartLabel={t('fault.restart')} />
    </>
  );
}

function StepNav({
  onBack,
  onRestart,
  backLabel,
  restartLabel,
}: {
  onBack: () => void;
  onRestart: () => void;
  backLabel: string;
  restartLabel: string;
}) {
  return (
    <View style={styles.nav}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        onPress={onBack}
        style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
      >
        <Text style={styles.navBtnText}>› {backLabel}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={restartLabel}
        onPress={onRestart}
        style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
      >
        <Text style={styles.navBtnText}>↺ {restartLabel}</Text>
      </Pressable>
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
  subtitle: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  disclaimer: {
    color: color.warning.DEFAULT,
    fontSize: typography.size.caption,
    marginTop: spacing[2],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  appliances: {
    gap: spacing[3],
  },
  choice: {
    alignItems: 'center',
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    padding: spacing[5],
    gap: spacing[1],
    minHeight: 120,
  },
  pressed: {
    opacity: 0.8,
  },
  choiceTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    marginTop: spacing[2],
  },
  choiceTagline: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
  },
  choiceCta: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    marginTop: spacing[2],
  },
  recap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  recapText: {
    color: color.surface.base,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  recapBtn: {
    backgroundColor: color.brand.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  recapBtnText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
  },
  symptoms: {
    gap: spacing[3],
  },
  symptom: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    padding: spacing[4],
    minHeight: 68,
  },
  symptomText: {
    flex: 1,
  },
  symptomTitle: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  symptomFreq: {
    color: color.brand.gold,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  chevron: {
    color: color.text.secondary,
    fontSize: 24,
    marginStart: spacing[2],
  },
  result: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  sectionLabel: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  symptomResult: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bullet: {
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  safeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  safeNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: color.success.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeNumberText: {
    color: color.surface.base,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.bold,
  },
  safeText: {
    flex: 1,
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  warning: {
    color: color.error.DEFAULT,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  action: {
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  cta: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  ctaText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  nav: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  navBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
