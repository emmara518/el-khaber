/**
 * Service Request screen (Batch D) — 7-step form on the existing
 * `(customer)/request-service` route with the unchanged Batch-C
 * handoff contract (technicianId + appliance? + symptomId?).
 *
 * One draft machine: Next/Back/Edit preserve everything; changing
 * the appliance clears only dependent problem picks. Technician,
 * appliance, and symptom prefill from the handoff; a general path
 * works with no symptom. Photos are picked from the library/camera
 * (Track B2) and uploaded AFTER creation (grant → PUT → confirm);
 * a failed photo never loses the created request.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSafeBack } from '../components/use-safe-back';
import { ApiTechnicianDataSource } from '../discovery/api-technician-data-source';
import { ApiFaultGuideDataSource } from '../fault-guide/api-fault-guide-data-source';
import { orderReferenceLabel } from '../orders/order-reference';

import {
  pickDraftPhotoFromLibrary,
  takeDraftPhotoWithCamera,
  type DraftPhotoPickResult,
} from './draft-photos';
import {
  PREFERRED_PERIODS,
  composePreferredAtISO,
  formatPreferredAppointmentAr,
  preferredAppointmentDays,
  preferredAppointmentError,
  preferredDayIdFromISO,
  preferredPeriodIdFromISO,
  type PreferredPeriodId,
} from './preferred-appointment';
import { ServiceRequestProgress } from './service-request-progress';
import { REQUEST_SCENES } from './service-request-scenes';
import {
  DESCRIPTION_MAX,
  NAV_ICONS,
  OTHER_PROBLEM_ID,
  PHOTOS_MAX,
  STEP_INDEX,
  problemsForAppliance,
  type RequestAttachment,
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
import { APPLIANCE_LABELS as APPLIANCE_TITLES, APPLIANCE_ORDER } from '@/lib/appliance-labels';
import { ListError, ListLoading } from '@/ui';
import { ApplianceIcon, Avatar, Card, Icon, SectionHeading, type } from '@/ui';
import { applianceSceneAsset, SceneAction, SceneHero, SceneObject, SceneSection } from '@/ui/cinematic';

export default function ServiceRequestScreen({
  handoff,
  source,
}: {
  handoff: ServiceRequestHandoff;
  source?: ServiceRequestDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
      // Supporting context only (prefills the symptom problem). A failure
      // degrades truthfully: the form still loads and the customer can pick
      // the problem manually — the form's own loading/error state is above.
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

  if (vm.submission !== null && vm.submitStatus !== 'error') {
    const submission = vm.submission;
    const photosTotal = vm.machine.draft.photos.length;
    const failedCount = vm.failedPhotos.length;
    const partial = failedCount > 0;
    const uploading = vm.submitStatus === 'uploading';
    const retryBusy = uploading && partial;
    const initialUpload = uploading && !partial;
    const done = vm.uploadProgress?.done ?? 0;
    const uploadedCount = photosTotal - failedCount;
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <SceneHero
          compact
          asset="service_request_success"
          eyebrow={initialUpload || partial ? 'تم إنشاء الطلب' : 'تم إرسال الطلب'}
          title={initialUpload ? t('request.success.uploading') : t('request.success.title')}
          body={
            initialUpload
              ? `جارٍ رفع الصور… (${String(done)} من ${String(photosTotal)})`
              : 'يمكنك الآن متابعة حالة الطلب ورد الفني. إرسال الطلب لا يعني تأكيد موعد الزيارة.'
          }
          {...(initialUpload
            ? {}
            : {
                action: (
                  <SceneAction
                    label={t('request.success.track')}
                    disabled={retryBusy}
                    onPress={() =>
                      router.replace({
                        pathname: '/(customer)/requests/[id]',
                        params: { id: submission.requestId },
                      })
                    }
                  />
                ),
              })}
        />
        {partial ? (
          <SceneSection
            title={t('request.success.partialTitle')}
            body={`تم إنشاء الطلب، ولم تُرفع ${String(failedCount)} من ${String(photosTotal)} صورة. يمكنك إعادة المحاولة الآن أو المتابعة وسيظهر الطلب للفني.`}
          >
            <SceneAction
              icon="arrow-up"
              label={t('request.success.retryPhotos')}
              loading={retryBusy}
              loadingLabel={t('request.success.uploading')}
              onPress={vm.retryUploads}
            />
            <SceneAction variant="secondary" disabled={retryBusy} label={t('request.success.orders')} onPress={() => router.replace('/(customer)/requests')} />
          </SceneSection>
        ) : null}
        {!initialUpload ? (
          <SceneSection title={technician.nameAr} eyebrow={orderReferenceLabel(submission.requestId)} body={submission.createdAtAr}>
            <Text style={styles.contextValue}>{vm.machine.draft.appliance ? APPLIANCE_TITLES[vm.machine.draft.appliance] : ''}</Text>
            {!partial && photosTotal > 0 ? (
              <Text style={styles.contextValue}>{`تم رفع ${String(uploadedCount)} من ${String(photosTotal)} صورة`}</Text>
            ) : null}
            <SceneAction variant="secondary" disabled={retryBusy} label={t('request.success.orders')} onPress={() => router.replace('/(customer)/requests')} />
          </SceneSection>
        ) : null}
      </ScrollView>
    );
  }

  const { step, draft, stepError } = vm.machine;
  const scene = REQUEST_SCENES[step];

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 8}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        style={styles.flex}
      >
        <RequestHeader technician={technician} onExit={safeBack} />
        <ServiceRequestProgress index={STEP_INDEX[step]} />
        <SceneHero dense asset={scene.asset} eyebrow="طلب خدمة · خطوة بخطوة" title={scene.title} body={scene.body} />
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
          <PhotosStep
            photos={draft.photos}
            onAdd={(photo) => vm.dispatch({ type: 'ADD_PHOTO', photo })}
            onRemove={(photoId) => vm.dispatch({ type: 'REMOVE_PHOTO', photoId })}
            onEditDescription={() => vm.dispatch({ type: 'GOTO', step: 'description' })}
          />
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
            preferredAtISO={draft.preferredAtISO}
            onSelect={(preferredAtISO) => vm.dispatch({ type: 'SET_PREFERRED_AT', preferredAtISO })}
          />
        ) : null}
        {step === 'review' ? (
          <ReviewStep
            draft={draft}
            technicianName={technician.nameAr}
            problems={vm.formData.problems}
            locations={vm.formData.locations}
            submitStatus={vm.submitStatus}
            submitError={vm.submitError}
            uploadProgress={vm.uploadProgress}
            onGoto={(target) => vm.dispatch({ type: 'GOTO', step: target })}
            onSubmit={vm.submit}
            onRetrySubmit={() => {
              vm.retrySubmit();
              vm.submit();
            }}
          />
        ) : null}

        </View>
      </ScrollView>
      {step !== 'review' ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
          <SceneAction style={{ flex: 1 }} variant="secondary" icon={NAV_ICONS.back} label={t('request.back')} disabled={step === 'appliance'} onPress={() => vm.dispatch({ type: 'BACK' })} />
          <SceneAction style={{ flex: 2 }} icon={NAV_ICONS.next} label={step === 'photos' && draft.photos.length === 0 ? t('request.photos.continue') : t('request.next')} onPress={() => vm.dispatch({ type: 'NEXT' })} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
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
          <Icon name="x" size={16} color={color.error.DEFAULT} accessible={false} />
          <Text style={styles.exitText}>{t('request.cancel')}</Text>
        </Pressable>
      </View>
      <View style={styles.techCard}>
        <Avatar initials={technician.initialsAr} size={48} accessibilityLabel={technician.nameAr} />
        <View style={styles.techText}>
          <Text style={styles.techName}>{technician.nameAr}</Text>
          <View style={styles.techMetaRow}>
            <Icon name="star" size={13} color={color.brand.gold} accessible={false} />
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
  const options: ReadonlyArray<ApplianceSlug> = APPLIANCE_ORDER;
  return (
    <View>
      <SectionHeading title={t('request.appliance.title')} />
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
      <SectionHeading title={t('request.problem.title')} />
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
                aria-checked={selected}
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
          aria-checked={draft.problemId === OTHER_PROBLEM_ID}
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
      <SectionHeading title={t('request.description.title')} />
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
      <SectionHeading title={t('request.location.title')} />
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
                accessibilityLabel={`الموقع: ${location.labelAr}${location.detailAr.trim().length > 0 ? `، ${location.detailAr}` : ''}${selected ? '، محدد حاليًا' : ''}`}
                accessibilityState={{ selected, checked: selected }}
                aria-checked={selected}
                onPress={() => onSelect(location.id)}
                style={({ pressed }) => [styles.listOption, selected && styles.optionSelected, pressed && styles.pressed]}
              >
                <View style={styles.locationText}>
                  <View style={styles.iconLead}>
                    <Icon name="map-pin" size={15} color={color.text.secondary} accessibilityLabel="الموقع" />
                    <Text style={styles.listOptionText}>{location.labelAr}</Text>
                  </View>
                  {location.detailAr.trim().length > 0 ? (
                    <Text style={styles.locationDetail}>{location.detailAr}</Text>
                  ) : null}
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
  preferredAtISO,
  onSelect,
}: {
  preferredAtISO: string | null;
  onSelect: (preferredAtISO: string | null) => void;
}) {
  const { t } = useI18n();
  const days = useMemo(() => preferredAppointmentDays(), []);
  const selectedDayId = preferredDayIdFromISO(preferredAtISO);
  const selectedPeriodId = preferredPeriodIdFromISO(preferredAtISO);
  const error = preferredAppointmentError(preferredAtISO);

  const pickDay = (dayId: string) => {
    const next = composePreferredAtISO(dayId, selectedPeriodId ?? 'morning');
    if (next !== null) onSelect(next);
  };

  const pickPeriod = (periodId: PreferredPeriodId) => {
    const dayId = selectedDayId ?? days[0]?.id;
    if (dayId === undefined) return;
    const next = composePreferredAtISO(dayId, periodId);
    if (next !== null) onSelect(next);
  };

  return (
    <View>
      <SectionHeading title={t('request.appointment.title')} />
      <Text style={styles.appointmentNote}>{t('request.appointment.preferenceNote')}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('request.appointment.title')} style={styles.options}>
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel={`${t('request.appointment.phone')}${preferredAtISO === null ? '، محدد حاليًا' : ''}`}
          accessibilityState={{ selected: preferredAtISO === null, checked: preferredAtISO === null }}
          aria-checked={preferredAtISO === null}
          onPress={() => onSelect(null)}
          style={({ pressed }) => [
            styles.listOption,
            preferredAtISO === null && styles.optionSelected,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.locationText}>
            <View style={styles.iconLead}>
              <Icon name="phone" size={15} color={color.text.secondary} accessibilityLabel="تواصل هاتفي" />
              <Text style={styles.listOptionText}>{t('request.appointment.phone')}</Text>
            </View>
          </View>
          {preferredAtISO === null ? <Icon name="check" size={16} color={color.brand.navy} accessibilityLabel="محدد" /> : null}
        </Pressable>
      </View>

      <Text style={styles.fieldLabel}>{t('request.appointment.day')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayStrip}
        style={styles.dayStripScroll}
      >
        {days.map((day) => {
          const selected = selectedDayId === day.id;
          return (
            <Pressable
              key={day.id}
              accessibilityRole="radio"
              accessibilityLabel={`موعد مفضل: ${day.relativeAr}، ${day.dateAr}${selected ? '، محدد حاليًا' : ''}`}
              accessibilityState={{ selected, checked: selected }}
              aria-checked={selected}
              onPress={() => pickDay(day.id)}
              style={({ pressed }) => [
                styles.dayChip,
                selected && styles.dayChipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.dayChipRelative, selected && styles.dayChipTextSelected]}>{day.relativeAr}</Text>
              <Text style={[styles.dayChipDate, selected && styles.dayChipTextSelected]}>{day.dateAr}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.fieldLabel}>{t('request.appointment.period')}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('request.appointment.period')} style={styles.periodRow}>
        {PREFERRED_PERIODS.map((period) => {
          const selected = selectedPeriodId === period.id;
          return (
            <Pressable
              key={period.id}
              accessibilityRole="radio"
              accessibilityLabel={`فترة مفضلة: ${period.labelAr}${selected ? '، محددة حاليًا' : ''}`}
              accessibilityState={{ selected, checked: selected }}
              aria-checked={selected}
              onPress={() => pickPeriod(period.id)}
              style={({ pressed }) => [
                styles.periodChip,
                selected && styles.periodChipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.periodChipText, selected && styles.dayChipTextSelected]}>{period.labelAr}</Text>
            </Pressable>
          );
        })}
      </View>

      {error !== null ? (
        <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${error}`} style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function PhotosStep({
  photos,
  onAdd,
  onRemove,
  onEditDescription,
}: {
  photos: ReadonlyArray<RequestAttachment>;
  onAdd: (photo: RequestAttachment) => void;
  onRemove: (photoId: string) => void;
  onEditDescription: () => void;
}) {
  const { t } = useI18n();
  const [pickError, setPickError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const atLimit = photos.length >= PHOTOS_MAX;

  const pick = (run: () => Promise<DraftPhotoPickResult>): void => {
    if (picking || atLimit) return;
    setPicking(true);
    setPickError(null);
    void run()
      .then((result) => {
        if (result.outcome === 'picked') {
          onAdd(result.photo);
        } else if (result.outcome === 'denied' || result.outcome === 'tooLarge') {
          setPickError(result.messageAr);
        }
      })
      .catch(() => {
        setPickError('تعذر فتح الصور. حاول مجددًا');
      })
      .finally(() => {
        setPicking(false);
      });
  };

  return (
    <SceneSection title={t('request.photos.title')} body={t('request.photos.continueBody')}>
      {pickError !== null ? (
        <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${pickError}`} style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{pickError}</Text>
        </View>
      ) : null}
      {photos.length === 0 ? (
        <Text style={styles.photosEmpty}>{t('request.photos.empty')}</Text>
      ) : (
        <View style={styles.photosGrid}>
          {photos.map((photo) => (
            <View key={photo.id} style={styles.photoTile}>
              <Image
                source={{ uri: photo.uri }}
                style={styles.photoImage}
                resizeMode="cover"
                accessible
                accessibilityLabel={photo.fileName}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('request.photos.remove')}
                onPress={() => onRemove(photo.id)}
                hitSlop={8}
                style={({ pressed }) => [styles.photoRemove, pressed && styles.pressed]}
              >
                <Icon name="x" size={14} color={color.surface.base} accessible={false} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <Text style={styles.photosCounter}>{`${String(photos.length)} من ${String(PHOTOS_MAX)} صور`}</Text>
      <View style={styles.photosActions}>
        <SceneAction
          icon="image"
          label={t('request.photos.library')}
          disabled={picking || atLimit}
          loading={picking}
          loadingLabel="جارٍ فتح الصور…"
          onPress={() => pick(pickDraftPhotoFromLibrary)}
          style={{ flex: 1 }}
        />
        <SceneAction
          variant="secondary"
          icon="camera"
          label={t('request.photos.camera')}
          disabled={picking || atLimit}
          onPress={() => pick(takeDraftPhotoWithCamera)}
          style={{ flex: 1 }}
        />
      </View>
      {atLimit ? (
        <Text style={styles.photosHint}>{`بلغت الحد الأقصى (${String(PHOTOS_MAX)} صور). أزل صورة لإضافة غيرها.`}</Text>
      ) : null}
      <SceneAction label={t('request.photos.editDescription')} variant="secondary" icon="arrow-right" onPress={onEditDescription} />
    </SceneSection>
  );
}

function ReviewStep({
  draft,
  technicianName,
  problems,
  locations,
  submitStatus,
  submitError,
  uploadProgress,
  onGoto,
  onSubmit,
  onRetrySubmit,
}: {
  draft: ServiceRequestDraft;
  technicianName: string;
  problems: ReadonlyArray<{ id: string; titleAr: string }>;
  locations: ReadonlyArray<{ id: string; labelAr: string; detailAr: string }>;
  submitStatus: 'idle' | 'submitting' | 'uploading' | 'success' | 'partial' | 'error';
  submitError: string | null;
  uploadProgress: { readonly done: number; readonly total: number } | null;
  onGoto: (step: ServiceRequestStep) => void;
  onSubmit: () => void;
  onRetrySubmit: () => void;
}) {
  const { t } = useI18n();
  const problemTitle =
    draft.problemId === OTHER_PROBLEM_ID
      ? draft.customProblemAr
      : (problems.find((p) => p.id === draft.problemId)?.titleAr ?? t('request.review.noProblem'));
  const location = locations.find((l) => l.id === draft.locationId);
  const rows: ReadonlyArray<{ key: string; label: string; value: string; step: ServiceRequestStep }> = [
    { key: 'tech', label: t('request.review.technician'), value: technicianName, step: 'appliance' },
    {
      key: 'appliance',
      label: t('request.review.appliance'),
      value: draft.appliance !== null ? APPLIANCE_TITLES[draft.appliance] : t('request.review.noAppliance'),
      step: 'appliance',
    },
    { key: 'problem', label: t('request.review.problem'), value: problemTitle, step: 'problem' },
    {
      key: 'desc',
      label: t('request.review.description'),
      value: draft.descriptionAr.trim().length > 0 ? draft.descriptionAr : t('request.review.noDescription'),
      step: 'description',
    },
    {
      key: 'photos',
      label: t('request.review.photos'),
      value: draft.photos.length > 0 ? `${draft.photos.length} صور` : t('request.review.noPhotos'),
      step: 'photos',
    },
    {
      key: 'loc',
      label: t('request.review.location'),
      value: location
        ? (location.detailAr.trim().length > 0 ? `${location.labelAr} · ${location.detailAr}` : location.labelAr)
        : t('request.review.noLocation'),
      step: 'location',
    },
    {
      key: 'slot',
      label: t('request.review.appointment'),
      value:
        draft.preferredAtISO !== null
          ? `${formatPreferredAppointmentAr(draft.preferredAtISO)} · ${t('request.appointment.preferenceShort')}`
          : t('request.appointment.phone'),
      step: 'appointment',
    },
  ];
  const uploading = submitStatus === 'uploading';
  const submitting = submitStatus === 'submitting';
  const busy = submitting || uploading;
  return (
    <View>
      <SectionHeading title={t('request.review.title')} />
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
              disabled={busy}
              accessibilityState={{ disabled: busy }}
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
      <SceneAction
        label={t(submitStatus === 'error' ? 'request.retrySubmit' : 'request.submit')}
        loading={busy}
        loadingLabel={
          uploading
            ? `جارٍ رفع الصور… (${String(uploadProgress?.done ?? 0)}/${String(uploadProgress?.total ?? 0)})`
            : 'جارٍ إرسال الطلب…'
        }
        onPress={submitStatus === 'error' ? onRetrySubmit : onSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  applianceContext: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[4], borderBottomWidth: 1, borderBottomColor: color.border.default },
  stepBody: { paddingVertical: spacing[4] },
  content: {
    direction: 'rtl',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[6],
  },
  footer: {
    direction: 'rtl',
    flexDirection: 'row',
    gap: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    backgroundColor: color.surface.subtle,
    borderTopWidth: 1,
    borderTopColor: color.border.default,
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
    backgroundColor: color.brand.goldSoft,
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
  appointmentNote: {
    ...type.body,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  fieldLabel: {
    ...type.cardTitle,
    color: color.text.primary,
    textAlign: 'right',
    marginTop: spacing[5],
    marginBottom: spacing[2],
  },
  dayStripScroll: {
    marginHorizontal: -spacing[5],
  },
  dayStrip: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
  },
  dayChip: {
    minWidth: 96,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  dayChipSelected: {
    borderColor: color.brand.gold,
    borderWidth: 2,
    backgroundColor: color.brand.goldSoft,
  },
  dayChipRelative: {
    ...type.bodyMedium,
    color: color.text.primary,
    writingDirection: 'rtl',
  },
  dayChipDate: {
    ...type.caption,
    color: color.text.secondary,
    writingDirection: 'rtl',
  },
  dayChipTextSelected: {
    color: color.brand.navy,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  periodChip: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[2],
  },
  periodChipSelected: {
    borderColor: color.brand.gold,
    borderWidth: 2,
    backgroundColor: color.brand.goldSoft,
  },
  periodChipText: {
    ...type.caption,
    color: color.text.primary,
    textAlign: 'center',
    writingDirection: 'rtl',
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
  photosEmpty: {
    ...type.body,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingVertical: spacing[3],
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    paddingVertical: spacing[3],
  },
  photoTile: {
    width: 96,
    height: 96,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: color.surface.subtle,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: spacing[1],
    left: spacing[1],
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.text.primary,
  },
  photosCounter: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
  },
  photosActions: {
    flexDirection: 'row',
    direction: 'rtl',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  photosHint: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    marginTop: spacing[2],
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
