import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListEmpty, ListError, ListLoading } from '../components/list-state-view';

import { symptomsForAppliance, type FaultDetail } from './fault-guide-types';
import { FaultProgressIndicator } from './fault-progress-indicator';
import { useFaultGuideViewModel } from './use-fault-guide-view-model';

import type { SceneAssetName } from '@/ui/scene-assets';

import { useI18n } from '@/i18n/use-i18n';
import { Icon, type } from '@/ui';
import { applianceBrandAsset, SceneAction, SceneHero, SceneObject, SceneSection } from '@/ui/cinematic';

const arrival = FadeIn.duration(220).reduceMotion(ReduceMotion.System);
const faultScenes: Record<string, SceneAssetName> = {
  washing_machine: 'fault_washing_machine',
  refrigerator: 'fault_refrigerator',
  air_conditioner: 'fault_air_conditioner',
};

export default function FaultGuideScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useFaultGuideViewModel();
  const appliance = vm.data?.appliances.find((item) => item.slug === vm.appliance);
  const symptom = vm.data?.symptoms.find((item) => item.id === vm.symptomId);
  const stageAsset: SceneAssetName = vm.step === 'RESULT'
    ? 'fault_success'
    : vm.step === 'NO_MATCH' || vm.step === 'ERROR'
      ? 'fault_empty'
      : vm.step === 'LOADING'
        ? 'fault_diagnosis_visual'
        : (vm.appliance ? faultScenes[vm.appliance] : undefined) ?? 'fault_diagnosis_visual';
  const stageTitle = vm.step === 'APPLIANCE' ? 'ابدأ بجهازك'
    : vm.step === 'SYMPTOM' ? 'ما الذي لاحظته؟'
      : vm.step === 'LOADING' ? t('fault.resolving')
        : vm.step === 'RESULT' ? 'إرشاداتك والخطوة التالية'
          : vm.step === 'NO_MATCH' ? t('fault.noMatch.title') : t('fault.error.title');
  const findTechnician = () => router.push({
    pathname: '/(customer)/find-technician',
    params: { symptomId: vm.symptomId ?? '' },
  });

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SceneHero
          asset={stageAsset}
          compact={vm.step !== 'APPLIANCE'}
          eyebrow={t('maintenance.title')}
          title={stageTitle}
          body={vm.step === 'APPLIANCE' ? t('maintenance.subtitle') : appliance?.titleAr}
        >
          {vm.step !== 'APPLIANCE' ? (
            <Animated.View key={`${vm.step}-${vm.appliance}`} entering={arrival} style={styles.stage} accessibilityLiveRegion="polite">
              <Text style={styles.stageText}>{symptom?.titleAr ?? 'اختر العرض الذي يصف حالة جهازك.'}</Text>
            </Animated.View>
          ) : null}
        </SceneHero>
        <View style={styles.editorial}>
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
              <FaultProgressIndicator position={vm.step === 'APPLIANCE' ? 0 : vm.step === 'SYMPTOM' ? 1 : 2} />
              {vm.step === 'APPLIANCE' ? (
                <SceneSection title={t('fault.chooseAppliance')} eyebrow="الخطوة الأولى">
                  <View accessibilityRole="radiogroup" accessibilityLabel={t('fault.chooseAppliance')} style={styles.appliances}>
                    {vm.data.appliances.map((item) => (
                      <SceneObject
                        key={item.slug}
                        brandAsset={applianceBrandAsset(item.slug)}
                        title={item.titleAr}
                        body={item.taglineAr}
                        onPress={() => vm.selectAppliance(item.slug)}
                      />
                    ))}
                  </View>
                  {vm.data.appliances.length === 0 ? (
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
    </SafeAreaView>
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
  root: { flex: 1, backgroundColor: color.brand.navy, direction: 'rtl' },
  content: { flexGrow: 1, backgroundColor: color.surface.subtle, paddingBottom: spacing[8] },
  editorial: { paddingHorizontal: spacing[5], paddingTop: spacing[4] },
  stage: { marginTop: spacing[2] },
  stageText: { flex: 1, ...type.body, color: color.surface.base, textAlign: 'right', writingDirection: 'rtl' },
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
