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

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
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
import { MockTechnicianDataSource } from '../discovery/mock-technician-data-source';
import { MockFaultGuideDataSource } from '../fault-guide/mock-fault-guide-data-source';

import {
  MockServiceRequestDataSource,
  type ServiceRequestDataSource,
} from './mock-service-request-data-source';
import { ServiceRequestProgress } from './service-request-progress';
import {
  DESCRIPTION_MAX,
  OTHER_PROBLEM_ID,
  PHOTOS_MAX,
  STEP_INDEX,
  nextPhotoLabel,
  problemsForAppliance,
  type ServiceRequestDraft,
  type ServiceRequestHandoff,
  type ServiceRequestStep,
} from './service-request-types';
import { useServiceRequestViewModel } from './use-service-request-view-model';

import type { Technician } from '../discovery/technician-types';
import type { FaultGuideData } from '../fault-guide/fault-guide-types';
import type { ApplianceSlug } from '../home/data/customer-home-types';

import { useI18n } from '@/i18n/use-i18n';
import { ApplianceIcon, Avatar, Card, SectionHeader } from '@/ui';


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
  const vm = useServiceRequestViewModel(handoff, source ?? new MockServiceRequestDataSource());

  const [technician, setTechnician] = useState<Technician | null>(null);
  const [techMissing, setTechMissing] = useState(false);
  const [guide, setGuide] = useState<FaultGuideData | null>(null);

  useEffect(() => {
    let cancelled = false;
    new MockTechnicianDataSource()
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
    new MockFaultGuideDataSource()
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

  if (techMissing || technician === null) {
    if (technician !== null) return null;
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
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Card background={color.success.soft} borderColor={color.success.DEFAULT} padded style={styles.center}>
          <Text style={styles.successEmoji}>✓</Text>
          <Text accessibilityRole="header" style={styles.successTitle}>
            {t('request.success.title')}
          </Text>
          <Text style={styles.successBody}>{t('request.success.body')}</Text>
          <Text style={styles.successMeta}>
            رقم الطلب: {vm.submission.requestId} · {technician.nameAr}
          </Text>
        </Card>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('request.success.orders')}
          onPress={() => router.replace('/(customer)/requests')}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{t('request.success.orders')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('request.success.home')}
          onPress={() => router.replace('/(customer)')}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{t('request.success.home')}</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const { step, draft, stepError } = vm.machine;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <RequestHeader technician={technician} onExit={safeBack} />
      <ServiceRequestProgress index={STEP_INDEX[step]} />

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
          draft={draft}
          onAdd={() =>
            vm.dispatch({
              type: 'ADD_PHOTO',
              photoId: `photo-${draft.photos.length + 1}-${Date.now() % 100000}`,
              labelAr: nextPhotoLabel(draft.photos.length),
            })
          }
          onRemove={(photoId) => vm.dispatch({ type: 'REMOVE_PHOTO', photoId })}
        />
      ) : null}
      {step === 'location' ? (
        <LocationStep
          draft={draft}
          locations={vm.formData.locations}
          onSelect={(locationId) => vm.dispatch({ type: 'SET_LOCATION', locationId })}
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

      {step !== 'review' ? (
        <View style={styles.nav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('request.back')}
            onPress={() => vm.dispatch({ type: 'BACK' })}
            disabled={step === 'appliance'}
            style={({ pressed }) => [styles.navBtn, step === 'appliance' && styles.disabled, pressed && styles.pressed]}
          >
            <Text style={styles.navBtnText}>› {t('request.back')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('request.next')}
            onPress={() => vm.dispatch({ type: 'NEXT' })}
            style={({ pressed }) => [styles.navPrimary, pressed && styles.pressed]}
          >
            <Text style={styles.navPrimaryText}>{t('request.next')} ‹</Text>
          </Pressable>
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
          <Text style={styles.exitText}>✕ {t('request.cancel')}</Text>
        </Pressable>
      </View>
      <Card background={color.surface.base} padded style={styles.techCard}>
        <Avatar initials={technician.initialsAr} size={48} accessibilityLabel={technician.nameAr} />
        <View style={styles.techText}>
          <Text style={styles.techName}>{technician.nameAr}</Text>
          <Text style={styles.techMeta}>
            {technician.specialtiesAr.join(' · ')} · ★ {technician.rating.toFixed(1)}
          </Text>
        </View>
      </Card>
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
            <Pressable
              key={slug}
              accessibilityRole="radio"
              accessibilityLabel={`الجهاز: ${APPLIANCE_TITLES[slug]}${selected ? '، محدد حاليًا' : ''}`}
              accessibilityState={{ selected, checked: selected }}
              onPress={() => onSelect(slug)}
              style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
            >
              <ApplianceIcon slug={slug} size={56} />
              <Text style={styles.optionTitle}>{APPLIANCE_TITLES[slug]}</Text>
            </Pressable>
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
                {selected ? <Text style={styles.checkMark}>✓</Text> : null}
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
          {draft.problemId === OTHER_PROBLEM_ID ? <Text style={styles.checkMark}>✓</Text> : null}
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

function PhotosStep({
  draft,
  onAdd,
  onRemove,
}: {
  draft: ServiceRequestDraft;
  onAdd: () => void;
  onRemove: (photoId: string) => void;
}) {
  const { t } = useI18n();
  const full = draft.photos.length >= PHOTOS_MAX;
  return (
    <View>
      <SectionHeader titleKey="request.photos.title" />
      {draft.photos.length === 0 ? (
        <Card background={color.surface.base} padded style={styles.center}>
          <Text style={styles.emoji}>📷</Text>
          <Text style={styles.muted}>{t('request.photos.empty')}</Text>
        </Card>
      ) : (
        <View style={styles.photoGrid}>
          {draft.photos.map((photo) => (
            <View key={photo.id} style={styles.photo}>
              <Text style={styles.photoEmoji}>🖼️</Text>
              <Text style={styles.photoLabel}>{photo.labelAr}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('request.photos.remove')}: ${photo.labelAr}`}
                onPress={() => onRemove(photo.id)}
                style={styles.photoRemove}
              >
                <Text style={styles.photoRemoveText}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('request.photos.add')}، ${draft.photos.length} من ${PHOTOS_MAX}`}
        accessibilityState={{ disabled: full }}
        onPress={onAdd}
        disabled={full}
        style={({ pressed }) => [styles.secondary, full && styles.disabled, pressed && !full && styles.pressed]}
      >
        <Text style={styles.secondaryText}>
          ＋ {t('request.photos.add')} ({draft.photos.length}/{PHOTOS_MAX})
        </Text>
      </Pressable>
    </View>
  );
}

function LocationStep({
  draft,
  locations,
  onSelect,
}: {
  draft: ServiceRequestDraft;
  locations: ReadonlyArray<{ id: string; labelAr: string; detailAr: string }>;
  onSelect: (locationId: string) => void;
}) {
  const { t } = useI18n();
  return (
    <View>
      <SectionHeader titleKey="request.location.title" />
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
                <Text style={styles.listOptionText}>📍 {location.labelAr}</Text>
                <Text style={styles.locationDetail}>{location.detailAr}</Text>
              </View>
              {selected ? <Text style={styles.checkMark}>✓</Text> : null}
            </Pressable>
          );
        })}
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
          <Text style={styles.listOptionText}>📞 {t('request.appointment.phone')}</Text>
          {draft.appointmentSlotId === null ? <Text style={styles.checkMark}>✓</Text> : null}
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
              {selected ? <Text style={styles.checkMark}>✓</Text> : null}
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
      <Card background={color.surface.base} padded style={styles.review}>
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
          accessibilityLabel={t('request.retrySubmit')}
          onPress={onRetrySubmit}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{t('request.retrySubmit')}</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('request.submit')}
          accessibilityState={{ disabled: submitting, busy: submitting }}
          onPress={onSubmit}
          disabled={submitting}
          style={({ pressed }) => [styles.primary, submitting && styles.disabled, pressed && !submitting && styles.pressed]}
        >
          {submitting ? (
            <ActivityIndicator accessibilityLabel="جارٍ إرسال الطلب" color={color.surface.base} />
          ) : (
            <Text style={styles.primaryText}>{t('request.submit')}</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  exit: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  exitText: {
    color: color.error.DEFAULT,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
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
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  techMeta: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
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
    color: color.error.DEFAULT,
    fontSize: typography.size.body,
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
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
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
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  checkMark: {
    color: color.brand.gold,
    fontSize: 20,
    fontWeight: typography.weight.bold,
  },
  locationText: {
    flex: 1,
  },
  locationDetail: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  unavailable: {
    color: color.error.DEFAULT,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  contextCard: {
    marginBottom: spacing[3],
    gap: spacing[1],
  },
  contextLabel: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    textAlign: 'right',
  },
  contextValue: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
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
    marginTop: spacing[3],
  },
  multiline: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  counter: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'left',
  },
  center: {
    alignItems: 'center',
    marginTop: spacing[4],
    gap: spacing[2],
  },
  emoji: {
    fontSize: 40,
  },
  muted: {
    color: color.text.secondary,
    fontSize: typography.size.body,
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
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    padding: spacing[2],
    alignItems: 'center',
    gap: spacing[1],
  },
  photoEmoji: {
    fontSize: 32,
  },
  photoLabel: {
    color: color.text.primary,
    fontSize: typography.size.caption,
  },
  photoRemove: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: color.error.DEFAULT,
    fontSize: 18,
    fontWeight: typography.weight.bold,
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
  },
  secondaryText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
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
  },
  navPrimaryText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  successEmoji: {
    fontSize: 56,
    color: color.success.DEFAULT,
  },
  successTitle: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  successBody: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  successMeta: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
