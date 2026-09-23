/**
 * Service Request screen (Batch D) — 7-step form on the existing
 * `(customer)/request-service` route with the unchanged Batch-C
 * handoff contract (technicianId + appliance? + symptomId?).
 *
 * One draft machine: Next/Back/Edit preserve everything; changing
 * the appliance clears only dependent problem picks. Technician,
 * appliance, and symptom prefill from the handoff; a general path
 * works with no symptom. Photos use a typed mock-picker boundary
 * (no libraries, no uploads). Submission goes through
 * `ServiceRequestDataSource.submitRequest()` (mock adapter).
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ListError, ListLoading } from '../components/list-state-view';
import { useSafeBack } from '../components/use-safe-back';
import { ApiTechnicianDataSource } from '../discovery/api-technician-data-source';
import { ApiFaultGuideDataSource } from '../fault-guide/api-fault-guide-data-source';

import { ServiceRequestProgress } from './service-request-progress';
import { REQUEST_SCENES } from './service-request-scenes';
import {
  DESCRIPTION_MAX,
  OTHER_PROBLEM_ID,
  STEP_INDEX,
  problemsForAppliance,
  type ServiceRequestDraft,
  type ServiceRequestHandoff,
  type ServiceRequestStep,
} from './service-request-types';
import { useServiceRequestViewModel } from './use-service-request-view-model';

import type { ServiceRequestDataSource } from './mock-service-request-data-source';
import type { Technician } from '../discovery/technician-types';
import type { FaultGuideData } from '../fault-guide/fault-guide-types';
import type { ApplianceSlug } from '../home/data/customer-home-types';

import { useI18n } from '@/i18n/use-i18n';
import { ApplianceIcon, Avatar, Card, Icon, SectionHeader, type } from '@/ui';
import { applianceSceneAsset, SceneAction, SceneHero, SceneObject, SceneSection } from '@/ui/cinematic';


const APPLIANCE_TITLES: Record<ApplianceSlug, string> = {
  washing_machine: 'غسالات',
  refrigerator: 'ثلاجات',
  air_conditioner: 'تكييفات',
};

export default function ServiceRequestScreen({
  handoff,
  source,
}: {
  handoff: ServiceRequestHandoff;
  source?: ServiceRequestDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const safeBack = useSafeBack('/(customer)/find-technician');
  const vm = useServiceRequestViewModel(handoff, source);

  const [technician, setTechnician] = useState<Technician | null>(null);
  const [techMissing, setTechMissing] = useState(false);
  const [guide, setGuide] = useState<FaultGuideData | null>(null);

  useEffect(() => {
    let cancelled = false;
    new ApiTechnicianDataSource()
      .getTechnicians({ role: 'customer' })
      .then((techs) => {
        if (cancelled) return;
        const found = techs.find((tech) => tech.id === handoff.technicianId) ?? null;
        setTechnician(found);
        setTechMissing(found === null);
      })
      .catch(() => {
        if (!cancelled) setTechMissing(true);
      });
    new ApiFaultGuideDataSource()
      .getGuide({ role: 'customer' })
      .then((g) => {
        if (!cancelled) setGuide(g);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [handoff.technicianId]);

  // Prefill: default location + matching symptom problem, once each.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (vm.formStatus !== 'loaded' || vm.formData === null || prefilled) return;
    setPrefilled(true);
    const { draft } = vm.machine;
    if (draft.locationId === null) {
      const fallback = vm.formData.locations.find((l) => l.isDefault) ?? vm.formData.locations[0];
      if (fallback) vm.dispatch({ type: 'SET_LOCATION', locationId: fallback.id });
    }
    if (draft.problemId === null && draft.symptomId !== null) {
      const match = vm.formData.problems.some((p) => p.id === draft.symptomId);
      if (match && draft.symptomId !== null) {
        vm.dispatch({ type: 'SET_PROBLEM', problemId: draft.symptomId });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vm.formStatus, vm.formData, prefilled]);

  const symptomTitle = useMemo(() => {
    if (guide === null || vm.machine.draft.symptomId === null) return null;
    return guide.symptoms.find((s) => s.id === vm.machine.draft.symptomId)?.titleAr ?? null;
  }, [guide, vm.machine.draft.symptomId]);

  if (technician === null && !techMissing) {
    return <ListLoading label={t('state.loading')} />;
  }

  if (techMissing || technician === null) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('request.title')}
        </Text>
        <ListError
          title={t('request.error.technicianTitle')}
          message={t('request.error.technicianBody')}
          retryLabel={t('request.back')}
          onRetry={safeBack}
        />
      </ScrollView>
    );
  }

  if (vm.formStatus === 'loading') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <RequestHeader technician={technician} onExit={safeBack} />
        <ListLoading label={t('state.loading')} />
      </ScrollView>
    );
  }

  if (vm.formStatus === 'error' || vm.formData === null) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <RequestHeader technician={technician} onExit={safeBack} />
        <ListError
          title={t('request.error.formTitle')}
          message={vm.formError?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={vm.reloadForm}
        />
      </ScrollView>
    );
  }

  if (vm.submitStatus === 'success' && vm.submission !== null) {
    const submission = vm.submission;
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <SceneHero compact asset="service_request_success" eyebrow="تم إرسال الطلب" title={t('request.success.title')} body="يمكنك الآن متابعة حالة الطلب ورد الفني. إرسال الطلب لا يعني تأكيد موعد الزيارة."
          action={<SceneAction label={t('request.success.track')} onPress={() => router.replace({ pathname: '/(customer)/requests/[id]', params: { id: submission.requestId } })} />}
        />
        <SceneSection title={technician.nameAr} eyebrow={`رقم الطلب: ${submission.requestId}`} body={submission.createdAtAr}>
          <Text style={styles.contextValue}>{vm.machine.draft.appliance ? APPLIANCE_TITLES[vm.machine.draft.appliance] : ''}</Text>
          <SceneAction variant="secondary" label={t('request.success.orders')} onPress={() => router.replace('/(customer)/requests')} />
        </SceneSection>
      </ScrollView>
    );
  }

  const { step, draft, stepError } = vm.machine;
  const scene = REQUEST_SCENES[step];

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <RequestHeader technician={technician} onExit={safeBack} />
      <ServiceRequestProgress index={STEP_INDEX[step]} />
      <SceneHero compact asset={scene.asset} eyebrow="طلب خدمة · خطوة بخطوة" title={scene.title} body={scene.body} />
      {draft.appliance !== null ? (
        <View style={styles.applianceContext}>
          <ApplianceIcon slug={draft.appliance} size={40} />
          <View style={styles.techText}>
            <Text style={styles.contextLabel}>الجهاز المختار</Text>
            <Text style={styles.contextValue}>{APPLIANCE_TITLES[draft.appliance]}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="تغيير الجهاز" disabled={vm.submitStatus === 'submitting'} onPress={() => vm.dispatch({ type: 'GOTO', step: 'appliance' })} style={styles.reviewEdit}>
            <Text style={styles.reviewEditText}>تغيير</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.stepBody}>

      {stepError !== null ? (
        <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${stepError}`} style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{stepError}</Text>
        </View>
      ) : null}

      {step === 'appliance' ? (
        <ApplianceStep draft={draft} onSelect={(appliance) => vm.dispatch({ type: 'SET_APPLIANCE', appliance })} />
      ) : null}
      {step === 'problem' ? (
        <ProblemStep
          draft={draft}
          symptomTitle={symptomTitle}
          problems={problemsForAppliance(vm.formData.problems, draft.appliance)}
          onSelect={(problemId) => vm.dispatch({ type: 'SET_PROBLEM', problemId })}
          onCustom={(text) => vm.dispatch({ type: 'SET_CUSTOM_PROBLEM', text })}
        />
      ) : null}
      {step === 'description' ? (
        <DescriptionStep
          draft={draft}
          onChange={(text) => vm.dispatch({ type: 'SET_DESCRIPTION', text: text.slice(0, DESCRIPTION_MAX + 20) })}
        />
      ) : null}
      {step === 'photos' ? (
        <SceneSection title="تابع دون صور" body="لا يتم رفع أو إرسال أي صور مع الطلب في النسخة الحالية. اكتب التفاصيل المهمة في وصف المشكلة.">
          <SceneAction label="تعديل الوصف" variant="secondary" onPress={() => vm.dispatch({ type: 'GOTO', step: 'description' })} />
        </SceneSection>
      ) : null}
      {step === 'location' ? (
        <LocationStep
          draft={draft}
          locations={vm.formData.locations}
          onSelect={(locationId) => vm.dispatch({ type: 'SET_LOCATION', locationId })}
          onCreate={vm.addLocation}
          addStatus={vm.locationStatus}
          addError={vm.locationError}
        />
      ) : null}
      {step === 'appointment' ? (
        <AppointmentStep
          draft={draft}
          slots={vm.formData.slots}
          onSelect={(slotId) => vm.dispatch({ type: 'SET_APPOINTMENT', slotId })}
        />
      ) : null}
      {step === 'review' ? (
        <ReviewStep
          draft={draft}
          technicianName={technician.nameAr}
          problems={vm.formData.problems}
          locations={vm.formData.locations}
          slots={vm.formData.slots}
          submitStatus={vm.submitStatus}
          submitError={vm.submitError}
          onGoto={(target) => vm.dispatch({ type: 'GOTO', step: target })}
          onSubmit={vm.submit}
          onRetrySubmit={() => {
            vm.retrySubmit();
            vm.submit();
          }}
        />
      ) : null}

      </View>
      {step !== 'review' ? (
        <View style={styles.nav}>
          <SceneAction style={{ flex: 1 }} variant="secondary" label={t('request.back')} disabled={step === 'appliance'} onPress={() => vm.dispatch({ type: 'BACK' })} />
          <SceneAction style={{ flex: 2 }} label={step === 'photos' ? 'المتابعة دون صور' : t('request.next')} onPress={() => vm.dispatch({ type: 'NEXT' })} />
        </View>
      ) : null}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function RequestHeader({ technician, onExit }: { technician: Technician; onExit: () => void }) {
  const { t } = useI18n();
  return (
    <View>
      <View style={styles.headerRow}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('request.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('request.cancel')}
          onPress={onExit}
          style={({ pressed }) => [styles.exit, pressed && styles.pressed]}
        >
          <Icon name="x" size={16} color={color.error.DEFAULT} accessibilityLabel="إلغاء" />
          <Text style={styles.exitText}>{t('request.cancel')}</Text>
        </Pressable>
      </View>
      <View style={styles.techCard}>
        <Avatar initials={technician.initialsAr} size={48} accessibilityLabel={technician.nameAr} />
        <View style={styles.techText}>
          <Text style={styles.techName}>{technician.nameAr}</Text>
          <View style={styles.techMetaRow}>
            <Icon name="star" size={13} color={color.brand.gold} accessibilityLabel="التقييم" />
            <Text style={styles.techMeta}>
              {technician.specialtiesAr.join(' · ')} · {technician.rating.toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function ApplianceStep({
  draft,
  onSelect,
}: {
  draft: ServiceRequestDraft;
  onSelect: (appliance: ApplianceSlug) => void;
}) {
  const { t } = useI18n();
  const options: ReadonlyArray<ApplianceSlug> = ['washing_machine', 'refrigerator', 'air_conditioner'];
  return (
    <View>
      <SectionHeader titleKey="request.appliance.title" />
      <View accessibilityRole="radiogroup" accessibilityLabel={t('request.appliance.title')} style={styles.options}>
        {options.map((slug) => {
          const selected = draft.appliance === slug;
          return (
            <SceneObject key={slug} asset={applianceSceneAsset(slug)} title={APPLIANCE_TITLES[slug]} selected={selected} onPress={() => onSelect(slug)} />
          );
        })}
      </View>
    </View>
  );
}

function ProblemStep({
  draft,
  symptomTitle,
  problems,
  onSelect,
  onCustom,
}: {
  draft: ServiceRequestDraft;
  symptomTitle: string | null;
  problems: ReturnType<typeof problemsForAppliance>;
  onSelect: (problemId: string | null) => void;
  onCustom: (text: string) => void;
}) {
  const { t } = useI18n();
  return (
    <View>
      <SectionHeader titleKey="request.problem.title" />
      {symptomTitle !== null && draft.symptomId !== null ? (
        <Card background={color.brand.goldSoft} borderColor={color.brand.gold} padded style={styles.contextCard}>
          <Text style={styles.contextLabel}>{t('request.problem.fromGuide')}</Text>
          <Text style={styles.contextValue}>{symptomTitle}</Text>
        </Card>
      ) : null}
      <View style={styles.options}>
        {problems
          .filter((p) => p.id !== OTHER_PROBLEM_ID)
          .map((problem) => {
            const selected = draft.problemId === problem.id;
            return (
              <Pressable
                key={problem.id}
                accessibilityRole="radio"
                accessibilityLabel={`المشكلة: ${problem.titleAr}${selected ? '، محددة حاليًا' : ''}`}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => onSelect(selected ? null : problem.id)}
                style={({ pressed }) => [styles.listOption, selected && styles.optionSelected, pressed && styles.pressed]}
              >
                <Text style={styles.listOptionText}>{problem.titleAr}</Text>
                {selected ? <Icon name="check" size={16} color={color.brand.navy} accessibilityLabel="محدد" /> : null}
              </Pressable>
            );
          })}
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel={`${t('request.problem.other')}${draft.problemId === OTHER_PROBLEM_ID ? '، محددة حاليًا' : ''}`}
          accessibilityState={{ selected: draft.problemId === OTHER_PROBLEM_ID, checked: draft.problemId === OTHER_PROBLEM_ID }}
          onPress={() => onSelect(draft.problemId === OTHER_PROBLEM_ID ? null : OTHER_PROBLEM_ID)}
          style={({ pressed }) => [
            styles.listOption,
            draft.problemId === OTHER_PROBLEM_ID && styles.optionSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.listOptionText}>{t('request.problem.other')}</Text>
          {draft.problemId === OTHER_PROBLEM_ID ? <Icon name="check" size={16} color={color.brand.navy} accessibilityLabel="محدد" /> : null}
        </Pressable>
      </View>
      {draft.problemId === OTHER_PROBLEM_ID ? (
        <TextInput
          accessibilityLabel={t('request.problem.otherPlaceholder')}
          placeholder={t('request.problem.otherPlaceholder')}
          placeholderTextColor={color.text.secondary}
          value={draft.customProblemAr}
          onChangeText={onCustom}
          style={styles.input}
          textAlign="right"
          multiline
        />
      ) : null}
    </View>
  );
}

function DescriptionStep({
  draft,
  onChange,
}: {
  draft: ServiceRequestDraft;
  onChange: (text: string) => void;
}) {
  const { t } = useI18n();
  return (
    <View>
      <SectionHeader titleKey="request.description.title" />
      <TextInput
        accessibilityLabel={`${t('request.description.title')}، ${draft.descriptionAr.length} من ${DESCRIPTION_MAX} حرف`}
        placeholder={t('request.description.placeholder')}
        placeholderTextColor={color.text.secondary}
        value={draft.descriptionAr}
        onChangeText={onChange}
        style={[styles.input, styles.multiline]}
        textAlign="right"
        multiline
        numberOfLines={5}
      />
      <Text style={styles.counter}>
        {draft.descriptionAr.length} / {DESCRIPTION_MAX}
      </Text>
    </View>
  );
}

function LocationStep({
  draft,
  locations,
  onSelect,
  onCreate,
  addStatus,
  addError,
}: {
  draft: ServiceRequestDraft;
  locations: ReadonlyArray<{ id: string; labelAr: string; detailAr: string }>;
  onSelect: (locationId: string) => void;
  onCreate: (input: { labelAr: string; addressAr: string }) => void;
  addStatus: 'idle' | 'saving' | 'error';
  addError: string | null;
}) {
  const { t } = useI18n();
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const saving = addStatus === 'saving';
  const canSave = !saving && label.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    onCreate({ labelAr: label, addressAr: address });
    setLabel('');
    setAddress('');
  };

  return (
    <View>
      <SectionHeader titleKey="request.location.title" />
      {locations.length === 0 ? (
        <Text style={styles.emptyHint}>{t('request.location.empty')}</Text>
      ) : (
        <View accessibilityRole="radiogroup" accessibilityLabel={t('request.location.title')} style={styles.options}>
          {locations.map((location) => {
            const selected = draft.locationId === location.id;
            return (
              <Pressable
                key={location.id}
                accessibilityRole="radio"
                accessibilityLabel={`الموقع: ${location.labelAr}، ${location.detailAr}${selected ? '، محدد حاليًا' : ''}`}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => onSelect(location.id)}
                style={({ pressed }) => [styles.listOption, selected && styles.optionSelected, pressed && styles.pressed]}
              >
                <View style={styles.locationText}>
                  <View style={styles.iconLead}>
                    <Icon name="map-pin" size={15} color={color.text.secondary} accessibilityLabel="الموقع" />
                    <Text style={styles.listOptionText}>{location.labelAr}</Text>
                  </View>
                  <Text style={styles.locationDetail}>{location.detailAr}</Text>
                </View>
                {selected ? <Icon name="check" size={16} color={color.brand.navy} accessibilityLabel="محدد" /> : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.addLocation}>
        <Text style={styles.addLocationTitle}>{t('request.location.addTitle')}</Text>
        <TextInput
          accessibilityLabel={t('request.location.labelPlaceholder')}
          placeholder={t('request.location.labelPlaceholder')}
          placeholderTextColor={color.text.secondary}
          value={label}
          onChangeText={setLabel}
          editable={!saving}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel={t('request.location.addressPlaceholder')}
          placeholder={t('request.location.addressPlaceholder')}
          placeholderTextColor={color.text.secondary}
          value={address}
          onChangeText={setAddress}
          editable={!saving}
          style={styles.input}
        />
        {addError !== null ? (
          <Text accessibilityRole="alert" style={styles.inlineErrorText}>
            {addError}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('request.location.save')}
          accessibilityState={{ disabled: !canSave, busy: saving }}
          onPress={save}
          disabled={!canSave}
          style={({ pressed }) => [styles.addBtn, !canSave && styles.disabled, pressed && canSave && styles.pressed]}
        >
          {saving ? (
            <ActivityIndicator color={color.surface.base} />
          ) : (
            <View style={styles.addBtnInner}>
              <Icon name="plus" size={16} color={color.surface.base} />
              <Text style={styles.addBtnText}>{t('request.location.save')}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function AppointmentStep({
  draft,
  slots,
  onSelect,
}: {
  draft: ServiceRequestDraft;
  slots: ReadonlyArray<{ id: string; dayAr: string; timeAr: string; available: boolean }>;
  onSelect: (slotId: string | null) => void;
}) {
  const { t } = useI18n();
  return (
    <View>
      <SectionHeader titleKey="request.appointment.title" />
      <View accessibilityRole="radiogroup" accessibilityLabel={t('request.appointment.title')} style={styles.options}>
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel={`${t('request.appointment.phone')}${draft.appointmentSlotId === null ? '، محدد حاليًا' : ''}`}
          accessibilityState={{ selected: draft.appointmentSlotId === null, checked: draft.appointmentSlotId === null }}
          onPress={() => onSelect(null)}
          style={({ pressed }) => [
            styles.listOption,
            draft.appointmentSlotId === null && styles.optionSelected,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.locationText}>
            <View style={styles.iconLead}>
              <Icon name="phone" size={15} color={color.text.secondary} accessibilityLabel="تواصل هاتفي" />
              <Text style={styles.listOptionText}>{t('request.appointment.phone')}</Text>
            </View>
          </View>
          {draft.appointmentSlotId === null ? <Icon name="check" size={16} color={color.brand.navy} accessibilityLabel="محدد" /> : null}
        </Pressable>
        {slots.map((slot) => {
          const selected = draft.appointmentSlotId === slot.id;
          return (
            <Pressable
              key={slot.id}
              accessibilityRole="radio"
              accessibilityLabel={`موعد: ${slot.dayAr}، ${slot.timeAr}${slot.available ? '' : '، غير متاح'}${selected ? '، محدد حاليًا' : ''}`}
              accessibilityState={{ selected, checked: selected, disabled: !slot.available }}
              accessibilityHint={slot.available ? undefined : t('request.appointment.unavailable')}
              onPress={() => onSelect(slot.id)}
              disabled={!slot.available}
              style={({ pressed }) => [
                styles.listOption,
                selected && styles.optionSelected,
                !slot.available && styles.disabled,
                pressed && slot.available && styles.pressed,
              ]}
            >
              <View style={styles.locationText}>
                <Text style={styles.listOptionText}>
                  {slot.dayAr} · {slot.timeAr}
                </Text>
                {!slot.available ? (
                  <Text style={styles.unavailable}>{t('request.appointment.unavailable')}</Text>
                ) : null}
              </View>
              {selected ? <Icon name="check" size={16} color={color.brand.navy} accessibilityLabel="محدد" /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ReviewStep({
  draft,
  technicianName,
  problems,
  locations,
  slots,
  submitStatus,
  submitError,
  onGoto,
  onSubmit,
  onRetrySubmit,
}: {
  draft: ServiceRequestDraft;
  technicianName: string;
  problems: ReadonlyArray<{ id: string; titleAr: string }>;
  locations: ReadonlyArray<{ id: string; labelAr: string; detailAr: string }>;
  slots: ReadonlyArray<{ id: string; dayAr: string; timeAr: string }>;
  submitStatus: 'idle' | 'submitting' | 'success' | 'error';
  submitError: string | null;
  onGoto: (step: ServiceRequestStep) => void;
  onSubmit: () => void;
  onRetrySubmit: () => void;
}) {
  const { t } = useI18n();
  const problemTitle =
    draft.problemId === OTHER_PROBLEM_ID
      ? draft.customProblemAr
      : (problems.find((p) => p.id === draft.problemId)?.titleAr ?? t('request.review.none'));
  const location = locations.find((l) => l.id === draft.locationId);
  const slot = slots.find((s) => s.id === draft.appointmentSlotId);
  const rows: ReadonlyArray<{ key: string; label: string; value: string; step: ServiceRequestStep }> = [
    { key: 'tech', label: t('request.review.technician'), value: technicianName, step: 'appliance' },
    {
      key: 'appliance',
      label: t('request.review.appliance'),
      value: draft.appliance !== null ? APPLIANCE_TITLES[draft.appliance] : t('request.review.none'),
      step: 'appliance',
    },
    { key: 'problem', label: t('request.review.problem'), value: problemTitle, step: 'problem' },
    {
      key: 'desc',
      label: t('request.review.description'),
      value: draft.descriptionAr.trim().length > 0 ? draft.descriptionAr : t('request.review.none'),
      step: 'description',
    },
    {
      key: 'photos',
      label: t('request.review.photos'),
      value: draft.photos.length > 0 ? `${draft.photos.length} صور` : t('request.review.none'),
      step: 'photos',
    },
    {
      key: 'loc',
      label: t('request.review.location'),
      value: location ? `${location.labelAr} — ${location.detailAr}` : t('request.review.none'),
      step: 'location',
    },
    {
      key: 'slot',
      label: t('request.review.appointment'),
      value: slot ? `${slot.dayAr} · ${slot.timeAr}` : t('request.appointment.phone'),
      step: 'appointment',
    },
  ];
  const submitting = submitStatus === 'submitting';
  return (
    <View>
      <SectionHeader titleKey="request.review.title" />
      <View style={styles.review}>
        {rows.map((row) => (
          <View key={row.key} style={styles.reviewRow}>
            <View style={styles.reviewText}>
              <Text style={styles.reviewLabel}>{row.label}</Text>
              <Text style={styles.reviewValue}>{row.value}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('request.edit')} ${row.label}`}
              onPress={() => onGoto(row.step)}
              disabled={submitting}
              accessibilityState={{ disabled: submitting }}
              style={styles.reviewEdit}
            >
              <Text style={styles.reviewEditText}>{t('request.edit')}</Text>
            </Pressable>
          </View>
        ))}
      </View>
      {submitStatus === 'error' ? (
        <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${submitError ?? ''}`} style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{submitError}</Text>
        </View>
      ) : null}
      <SceneAction label={t(submitStatus === 'error' ? 'request.retrySubmit' : 'request.submit')} loading={submitting} loadingLabel="جارٍ إرسال الطلب…" onPress={submitStatus === 'error' ? onRetrySubmit : onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  applianceContext: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[4], borderBottomWidth: 1, borderBottomColor: color.border.default },
  stepBody: { paddingVertical: spacing[4] },
  content: {
    direction: 'rtl',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...type.h2,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  exit: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    flexDirection: 'row',
    gap: spacing[1] + 2,
  },
  exitText: {
    ...type.bodyMedium,
    color: color.error.DEFAULT,
  },
  techCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  techText: {
    flex: 1,
  },
  techName: {
    ...type.h3,
    color: color.text.primary,
    textAlign: 'right',
  },
  techMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[1] + 2,
    marginTop: spacing[1],
  },
  techMeta: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
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
    ...type.body,
    color: color.error.DEFAULT,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  options: {
    gap: spacing[3],
  },
  option: {
    alignItems: 'center',
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    padding: spacing[4],
    gap: spacing[1],
  },
  optionSelected: {
    borderColor: color.brand.gold,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.55,
  },
  optionTitle: {
    ...type.cardTitle,
    color: color.text.primary,
    marginTop: spacing[2],
  },
  listOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    padding: spacing[4],
    minHeight: 60,
    gap: spacing[2],
  },
  listOptionText: {
    flex: 1,
    ...type.bodyMedium,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  checkMark: {
    color: color.brand.navy,
  },
  iconLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1] + 2,
  },
  locationText: {
    flex: 1,
  },
  locationDetail: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  unavailable: {
    ...type.caption,
    color: color.error.DEFAULT,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  emptyHint: {
    ...type.body,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: spacing[2],
  },
  addLocation: {
    marginTop: spacing[5],
    gap: spacing[1],
  },
  addLocationTitle: {
    ...type.cardTitle,
    color: color.text.primary,
    textAlign: 'right',
  },
  addBtn: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.lg,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
  },
  addBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  addBtnText: {
    ...type.button,
    color: color.surface.base,
  },
  contextCard: {
    marginBottom: spacing[3],
    gap: spacing[1],
  },
  contextLabel: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
  },
  contextValue: {
    ...type.cardTitle,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  input: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    color: color.text.primary,
    ...type.body,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
    marginTop: spacing[3],
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  counter: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[1],
    textAlign: 'left',
  },
  center: {
    alignItems: 'center',
    marginTop: spacing[4],
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
  photoEmptyBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  muted: {
    ...type.body,
    color: color.text.secondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  photo: {
    width: 100,
    backgroundColor: color.surface.subtle,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    padding: spacing[2],
    alignItems: 'center',
    gap: spacing[1],
  },
  photoLabel: {
    ...type.caption,
    color: color.text.primary,
  },
  photoRemove: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
    flexDirection: 'row',
    gap: spacing[2],
  },
  secondaryText: {
    ...type.bodyMedium,
    color: color.brand.navy,
  },
  review: {
    gap: 0,
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
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
  },
  reviewValue: {
    ...type.bodyMedium,
    color: color.text.primary,
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
    ...type.label,
    color: color.brand.navy,
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
    ...type.button,
    color: color.surface.base,
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
    ...type.bodyMedium,
    color: color.brand.navy,
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
    ...type.button,
    color: color.surface.base,
  },
  successTitle: {
    ...type.h2,
    color: color.text.primary,
    textAlign: 'center',
  },
  successBody: {
    ...type.body,
    color: color.text.secondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  successMeta: {
    ...type.bodyMedium,
    color: color.text.primary,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
