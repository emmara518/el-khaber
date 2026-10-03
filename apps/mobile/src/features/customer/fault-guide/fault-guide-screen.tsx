import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { StepProgress } from '../components/step-progress';

import { symptomsForAppliance, type FaultDetail } from './fault-guide-types';
import { useFaultGuideViewModel } from './use-fault-guide-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { filterApprovedAppliances } from '@/lib/approved-appliances';
import { ListEmpty, ListError, ListLoading } from '@/ui';
import { AppHeader, Icon, PageTitle, type } from '@/ui';
import { applianceBrandAsset, SceneAction, SceneObject, SceneSection } from '@/ui/cinematic';

const arrival = FadeIn.duration(220).reduceMotion(ReduceMotion.System);
const STEPS_AR = ['الجهاز', 'العرض', 'النتيجة'] as const;

export default function FaultGuideScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useFaultGuideViewModel();
  // Approved MVP scope: expose only غسالات / ثلاجات / تكييفات regardless of
  // what the backend catalog returns. Future categories keep their assets in
  // the repo but are not offered here.
  const approvedAppliances = filterApprovedAppliances(vm.data?.appliances ?? []);
  const appliance = approvedAppliances.find((item) => item.slug === vm.appliance);
  const symptom = vm.data?.symptoms.find((item) => item.id === vm.symptomId);
  const stepIndex = vm.step === 'APPLIANCE' ? 0 : vm.step === 'SYMPTOM' ? 1 : 2;
  const findTechnician = () => router.push({
    pathname: '/(customer)/find-technician',
    params: { symptomId: vm.symptomId ?? '' },
  });

  return (
    <View style={styles.root}>
      <AppHeader
        onPressNotifications={() => router.push('/(customer)/notifications')}
        onPressAvatar={() => router.push('/(customer)/profile')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.editorial}>
          <PageTitle eyebrow={t('maintenance.title')} title="دليل الأعطال" body={t('maintenance.subtitle')} />
          <View style={styles.disclaimer}>
            <Icon name="info" size={20} color={color.brand.navy} />
            <Text style={styles.disclaimerText}>دليل استرشادي فقط — وليس تشخيصًا فنيًا معتمدًا.</Text>
          </View>
          {vm.loadStatus === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
          {vm.loadStatus === 'error' || (vm.loadStatus !== 'loading' && vm.data === null) ? (
            <ListError title={t('fault.error.title')} message={vm.loadError?.message ?? ''} retryLabel={t('state.retry')} onRetry={vm.reload} />
          ) : null}
          {vm.loadStatus !== 'loading' && vm.loadStatus !== 'error' && vm.data !== null ? (
            <>
              <StepProgress steps={STEPS_AR} current={stepIndex} />
              {vm.step !== 'APPLIANCE' ? (
                <Animated.View
                  key={`${vm.step}-${vm.appliance}`}
                  entering={arrival}
                  style={styles.stage}
                  accessibilityLiveRegion="polite"
                >
                  <Text style={styles.stageText}>{symptom?.titleAr ?? 'اختر العرض الذي يصف حالة جهازك.'}</Text>
                </Animated.View>
              ) : null}
              {vm.step === 'APPLIANCE' ? (
                <SceneSection title={t('fault.chooseAppliance')} eyebrow="الخطوة الأولى">
                  <View accessibilityRole="radiogroup" accessibilityLabel={t('fault.chooseAppliance')} style={styles.appliances}>
                    {approvedAppliances.map((item) => (
                      <SceneObject
                        key={item.slug}
                        brandAsset={applianceBrandAsset(item.slug)}
                        title={item.titleAr}
                        body={item.taglineAr}
                        onPress={() => vm.selectAppliance(item.slug)}
                      />
                    ))}
                  </View>
                  {approvedAppliances.length === 0 ? (
                    <ListEmpty icon="search" iconLabel={t('fault.noAppliances.title')} brandAsset="no-results" title={t('fault.noAppliances.title')} body={t('fault.noAppliances.body')} actionLabel={t('fault.noAppliances.action')} onAction={vm.reload} />
                  ) : null}
                </SceneSection>
              ) : null}
              {vm.step === 'SYMPTOM' && vm.appliance !== null ? (
                <SceneSection title={t('fault.chooseSymptom')} eyebrow={`الجهاز المختار: ${appliance?.titleAr ?? ''}`}>
                  <SceneAction label="تغيير الجهاز" variant="secondary" onPress={vm.back} />
                  <View style={styles.symptoms}>
                    {symptomsForAppliance(vm.data.symptoms, vm.appliance).map((item, index) => (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityLabel={`العرض: ${item.titleAr}${item.frequencyAr ? `. ${item.frequencyAr}` : ''}`}
                        onPress={() => vm.selectSymptom(item.id)}
                        style={({ pressed }) => [styles.symptom, pressed && styles.pressed]}
                      >
                        <Text style={styles.symptomIndex}>{(index + 1).toLocaleString('ar-EG')}</Text>
                        <View style={styles.symptomCopy}>
                          <Text style={styles.symptomTitle}>{item.titleAr}</Text>
                          {item.frequencyAr ? <Text style={styles.body}>{item.frequencyAr}</Text> : null}
                        </View>
                        <Icon name="arrow-left" size={20} color={color.brand.navy} />
                      </Pressable>
                    ))}
                    {symptomsForAppliance(vm.data.symptoms, vm.appliance).length === 0 ? (
                      <Text style={styles.body}>لا توجد أعراض مسجلة لهذا الجهاز حالياً. يمكنك تغيير الجهاز أو البدء من جديد.</Text>
                    ) : null}
                  </View>
                </SceneSection>
              ) : null}
              {vm.step === 'LOADING' ? <SceneSection title="نراجع اختيارك"><SceneAction label={t('fault.resolving')} loading loadingLabel={t('fault.resolving')} onPress={() => undefined} /></SceneSection> : null}
              {vm.step === 'RESULT' && vm.detail !== null ? (
                <ResultStep detail={vm.detail} symptomTitle={symptom?.titleAr ?? ''} onFindTechnician={findTechnician} />
              ) : null}
              {vm.step === 'NO_MATCH' ? (
                <ListEmpty icon="search" iconLabel="لا توجد نتيجة مطابقة" brandAsset="no-results" title={t('fault.noMatch.title')} body={t('fault.noMatch.body')} actionLabel={t('fault.findTechnician')} onAction={findTechnician} />
              ) : null}
              {vm.step === 'ERROR' ? (
                <ListError title={t('fault.error.title')} message={t('fault.error.body')} retryLabel={t('state.retry')} onRetry={vm.retryResolve} />
              ) : null}
              {vm.step !== 'APPLIANCE' && vm.step !== 'LOADING' ? <StepNav onBack={vm.back} onRestart={vm.restart} /> : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function ResultStep({ detail, symptomTitle, onFindTechnician }: { detail: FaultDetail; symptomTitle: string; onFindTechnician: () => void }) {
  const { t } = useI18n();
  return (
    <Animated.View entering={arrival}>
      <SceneSection title={symptomTitle} eyebrow="العرض" body="الأسباب التالية احتمالات استرشادية وليست تشخيصًا مؤكدًا.">
        <Text accessibilityRole="header" style={styles.symptomTitle}>الأسباب المحتملة</Text>
        {detail.possibleCausesAr.map((cause) => <Text key={cause} style={styles.body}>• {cause}</Text>)}
      </SceneSection>
      {detail.warningAr !== null ? (
        <View style={styles.warning} accessibilityRole="alert">
          <Icon name="alert-triangle" size={24} color={color.error.DEFAULT} />
          <Text style={styles.warningText}>{detail.warningAr}</Text>
        </View>
      ) : null}
      <SceneSection title="إرشادات آمنة" asset="fault_diagnosis_visual">
        {detail.safeStepsAr.map((step, index) => (
          <View key={step} style={styles.safeRow}>
            <Text style={styles.symptomIndex}>{(index + 1).toLocaleString('ar-EG')}</Text>
            <Text style={[styles.body, styles.safeText]}>{step}</Text>
          </View>
        ))}
      </SceneSection>
      <SceneSection title="ماذا تفعل الآن؟" body={detail.actionAr} action={<SceneAction label={t('fault.findTechnician')} onPress={onFindTechnician} />} />
    </Animated.View>
  );
}

function StepNav({ onBack, onRestart }: { onBack: () => void; onRestart: () => void }) {
  const { t } = useI18n();
  return (
    <View style={styles.nav}>
      <SceneAction label={t('fault.back')} variant="secondary" onPress={onBack} />
      <SceneAction label={t('fault.restart')} variant="secondary" onPress={onRestart} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle, direction: 'rtl' },
  content: { flexGrow: 1, backgroundColor: color.surface.subtle, paddingBottom: spacing[8] },
  editorial: { paddingHorizontal: spacing[5], paddingTop: spacing[2] },
  stage: { marginTop: spacing[1], marginBottom: spacing[1], paddingVertical: spacing[3], paddingHorizontal: spacing[4], backgroundColor: color.brand.goldSoft, borderRadius: radius.md },
  stageText: { ...type.bodyMedium, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  disclaimer: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingVertical: spacing[3] },
  disclaimerText: { flex: 1, ...type.caption, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  appliances: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  symptoms: { gap: spacing[2] },
  symptom: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[4], borderBottomWidth: 1, borderBottomColor: color.border.default, minHeight: 72 },
  symptomIndex: { ...type.number, color: color.brand.navy, minWidth: 28, textAlign: 'center' },
  symptomCopy: { flex: 1, gap: spacing[1] },
  symptomTitle: { ...type.h3, color: color.brand.navy, textAlign: 'right', writingDirection: 'rtl' },
  body: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  pressed: { opacity: 0.75 },
  warning: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: color.error.soft, padding: spacing[4], gap: spacing[3], borderRadius: radius.md, marginBottom: spacing[4] },
  warningText: { flex: 1, ...type.bodyMedium, color: color.error.DEFAULT, textAlign: 'right', writingDirection: 'rtl' },
  safeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  safeText: { flex: 1 },
  nav: { gap: spacing[3], marginTop: spacing[4] },
});
