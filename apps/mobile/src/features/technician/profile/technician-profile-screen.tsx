/**
 * Technician profile screen (T-B) — Customer visual language.
 *
 * AppHeader → PageTitle → identity card (approved technician user-type
 * asset) → verification card → about → services/appliances/areas →
 * rating → actions. Approved → full profile view + edit mode; pending /
 * rejected / action_required → status + update-data entry into the
 * prefilled onboarding flow. Rating and counts are server-owned.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LabeledInput, MultiSelectChips } from './components/profile-selectors';
import {
  APPLIANCE_OPTIONS,
  AREA_OPTIONS,
  draftFromProfile,
  validateProfileDraft,
  verificationStatusCopy,
  type TechnicianProfileDataSource,
  type TechnicianProfileDraft,
} from './technician-profile-types';
import { useTechnicianProfileViewModel } from './use-technician-profile-view-model';

import { useI18n } from '@/i18n/use-i18n';
import {
  ActionButton,
  AppHeader,
  Avatar,
  BrandImage,
  Card,
  Icon,
  ListError,
  ListLoading,
  PageTitle,
  RatingStars,
  SectionHeading,
} from '@/ui';
import { type } from '@/ui/typography';

export default function TechnicianProfileScreen({
  source,
}: {
  source?: TechnicianProfileDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useTechnicianProfileViewModel(source);

  const header = (
    <AppHeader
      onPressNotifications={() => router.push('/(technician)/notifications')}
      onPressAvatar={() => router.push('/(technician)/profile')}
    />
  );

  if (vm.loadStatus === 'loading') {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <PageTitle eyebrow="ملفك المهني" title={t('tech.profile.title')} />
          <ListLoading label={t('state.loading')} brandAsset="toolbox" />
        </ScrollView>
      </View>
    );
  }

  if (vm.loadStatus === 'error' || vm.profile === null) {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <PageTitle eyebrow="ملفك المهني" title={t('tech.profile.title')} />
          <ListError
            title={t('tech.profile.loadError')}
            message={vm.loadError?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={vm.reload}
          />
        </ScrollView>
      </View>
    );
  }

  const profile = vm.profile;
  const status = verificationStatusCopy(profile.verification);

  if (vm.editing) {
    return (
      <ProfileEditForm
        key={profile.displayNameAr}
        initial={draftFromProfile(profile)}
        saveStatus={vm.saveStatus}
        saveError={vm.saveError}
        onCancel={vm.cancelEdit}
        onSave={vm.save}
        onRetry={vm.retrySave}
        onDone={vm.cancelEdit}
      />
    );
  }

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PageTitle
          eyebrow="ملفك المهني"
          title={profile.displayNameAr}
          body={profile.specialtiesAr.join(' · ') || 'أكمل تخصصاتك ليظهر ملفك للعملاء.'}
        />

        <Card background={color.surface.base} padded style={styles.identity}>
          <View style={styles.identityRow}>
            <Avatar initials={profile.initialsAr} size={56} accessibilityLabel={`الصورة الرمزية لـ ${profile.displayNameAr}`} />
            <View style={styles.identityCopy}>
              <Text style={styles.name}>{profile.displayNameAr}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[profile.specialtiesAr[0], profile.areasAr.join('، ')].filter((p) => p).join(' · ') || '—'}
              </Text>
            </View>
            <View style={styles.roleArt} accessibilityRole="image" accessibilityLabel="فني">
              <BrandImage name="technician" size={44} />
            </View>
          </View>
        </Card>

        <Card
          background={profile.verification === 'approved' ? color.success.soft : color.brand.goldSoft}
          borderColor={profile.verification === 'approved' ? color.success.DEFAULT : color.brand.gold}
          padded
          style={styles.statusCard}
        >
          <View style={styles.statusIconWrap}>
            <Icon
              name={status.icon}
              size={22}
              color={profile.verification === 'approved' ? color.success.DEFAULT : color.brand.navy}
              accessibilityLabel={status.titleAr}
            />
          </View>
          <View style={styles.statusText}>
            <Text accessibilityLabel={`حالة التوثيق: ${status.titleAr}. ${status.bodyAr}`} style={styles.statusTitle}>
              {status.titleAr}
            </Text>
            <Text style={styles.muted}>{profile.verificationNoteAr || status.bodyAr}</Text>
          </View>
        </Card>

        {(profile.verification === 'rejected' || profile.verification === 'action_required') && (
          <ActionButton
            label={t('tech.profile.updateData')}
            onPress={() => router.push({ pathname: '/(technician)/onboarding', params: { resume: '1' } })}
          />
        )}

        <View style={styles.section}>
          <SectionHeading title={t('tech.profile.about')} />
          <Card background={color.surface.base} padded style={styles.card}>
            <Text style={styles.body}>{profile.bioAr || 'لم تُضف نبذة مهنية بعد'}</Text>
            <View style={styles.valueRow}>
              <Icon name="phone" size={16} color={color.text.secondary} accessibilityLabel="الهاتف" />
              <Text style={styles.value}>{profile.phoneAr || '—'}</Text>
            </View>
            <View style={styles.valueRow}>
              <Icon name="award" size={16} color={color.text.secondary} accessibilityLabel="الخبرة" />
              <Text style={styles.value}>
                {profile.experienceYears === null ? '—' : `${profile.experienceYears} سنوات خبرة`}
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeading title={t('tech.profile.services')} eyebrow="ما تقدّمه للعملاء" />
          <ChipRow items={profile.servicesAr} emptyLabel={t('tech.profile.emptyServices')} />
          <Text style={styles.chipGroupLabel}>{t('tech.profile.appliances')}</Text>
          <ChipRow
            items={profile.appliances.map((s) => APPLIANCE_OPTIONS.find((a) => a.slug === s)?.titleAr ?? s)}
            emptyLabel="—"
          />
        </View>

        <View style={styles.section}>
          <SectionHeading title={t('tech.profile.areas')} />
          <ChipRow items={profile.areasAr} emptyLabel={t('tech.profile.emptyAreas')} />
        </View>

        <View style={styles.section}>
          <SectionHeading title="تقييم العملاء" eyebrow="سجل الخدمة الفعلي" />
          <Card background={color.surface.base} padded style={styles.card}>
            <RatingStars rating={profile.rating} reviewCount={profile.reviewCount} />
            <Text style={styles.meta}>
              {t('tech.profile.completed')}: {profile.completedCount}
            </Text>
          </Card>
        </View>

        {profile.verification === 'approved' && (
          <ActionButton variant="primary" icon="edit-2" label={t('tech.profile.edit')} onPress={vm.startEdit} />
        )}
        <ActionButton
          variant="secondary"
          icon="settings"
          label={t('tech.settings.title')}
          onPress={() => router.push('/(technician)/settings')}
        />
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

function ChipRow({ items, emptyLabel }: { items: ReadonlyArray<string>; emptyLabel: string }) {
  if (items.length === 0) {
    return (
      <Card background={color.surface.base} padded>
        <Text style={styles.muted}>{emptyLabel}</Text>
      </Card>
    );
  }
  return (
    <View style={styles.chips}>
      {items.map((item) => (
        <View key={item} accessibilityLabel={item} style={styles.chip}>
          <Text style={styles.chipText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function ProfileEditForm({
  initial,
  saveStatus,
  saveError,
  onCancel,
  onSave,
  onRetry,
  onDone,
}: {
  initial: TechnicianProfileDraft;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveError: string | null;
  onCancel: () => void;
  onSave: (draft: TechnicianProfileDraft) => void;
  onRetry: (draft: TechnicianProfileDraft) => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<TechnicianProfileDraft>(initial);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const saving = saveStatus === 'saving';

  function patch(p: Partial<TechnicianProfileDraft>) {
    setDraft((d) => ({ ...d, ...p }));
    setErrors({});
  }

  function handleSave() {
    const validation = validateProfileDraft(draft);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    onSave(draft);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PageTitle eyebrow="الملف الشخصي" title={t('tech.profile.editTitle')} />
        <View style={styles.form}>
          <LabeledInput
            label={t('tech.profile.name')}
            value={draft.displayNameAr}
            onChange={(text) => patch({ displayNameAr: text })}
            error={errors.displayNameAr}
          />
          <LabeledInput
            label={t('tech.profile.phone')}
            value={draft.phoneAr}
            onChange={(text) => patch({ phoneAr: text })}
            error={errors.phoneAr}
            keyboardType="phone-pad"
          />
          <LabeledInput
            label={t('tech.profile.bio')}
            value={draft.bioAr}
            onChange={(text) => patch({ bioAr: text })}
            multiline
          />
          <LabeledInput
            label={t('tech.profile.experience')}
            value={draft.experienceYears === null ? '' : String(draft.experienceYears)}
            onChange={(text) => {
              const n = Number(text.replace(/[^0-9]/g, ''));
              patch({ experienceYears: text.trim().length === 0 ? null : n });
            }}
            error={errors.experienceYears}
            keyboardType="numeric"
          />
          <MultiSelectChips
            label={t('tech.profile.areas')}
            options={AREA_OPTIONS}
            selected={draft.areasAr}
            onToggle={(value) =>
              patch({
                areasAr: draft.areasAr.includes(value)
                  ? draft.areasAr.filter((v) => v !== value)
                  : [...draft.areasAr, value],
              })
            }
            error={errors.areasAr}
          />
        </View>
        {saveStatus === 'error' ? (
          <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${saveError ?? ''}`} style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{saveError}</Text>
          </View>
        ) : null}
        {saveStatus === 'saved' ? (
          <View accessibilityRole="alert" style={styles.savedBanner}>
            <Text style={styles.savedText}>{t('tech.profile.saved')}</Text>
          </View>
        ) : null}
        {saveStatus === 'saved' ? (
          <ActionButton label={t('tech.profile.backToProfile')} onPress={onDone} style={styles.blockGap} />
        ) : (
          <View style={styles.formActions}>
            <ActionButton
              label={saveStatus === 'error' ? t('tech.profile.retrySave') : t('tech.profile.save')}
              loading={saving}
              loadingLabel="جارٍ الحفظ"
              onPress={saveStatus === 'error' ? () => onRetry(draft) : handleSave}
            />
            <ActionButton variant="secondary" label={t('tech.profile.cancel')} disabled={saving} onPress={onCancel} />
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing[5], paddingTop: spacing[4], paddingBottom: spacing[8], gap: spacing[4] },
  section: { gap: spacing[3] },
  card: { gap: spacing[2] },
  identity: { gap: spacing[2] },
  identityRow: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[3] },
  identityCopy: { flex: 1, minWidth: 0, gap: spacing[1] },
  name: { ...type.h3, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  roleArt: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: color.brand.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[3] },
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { flex: 1, gap: spacing[1] },
  statusTitle: { ...type.cardTitle, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  muted: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  body: { ...type.body, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl' },
  valueRow: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', gap: spacing[2] },
  value: { ...type.bodyMedium, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl', flexShrink: 1 },
  meta: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  chipGroupLabel: { ...type.label, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl', marginTop: spacing[1] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 40,
    justifyContent: 'center',
  },
  chipText: { ...type.body, color: color.text.primary, writingDirection: 'rtl' },
  form: { gap: spacing[4] },
  formActions: { marginTop: spacing[4], gap: spacing[3] },
  blockGap: { marginTop: spacing[3] },
  inlineError: {
    backgroundColor: color.error.soft,
    borderWidth: 1,
    borderColor: color.error.DEFAULT,
    borderRadius: radius.md,
    padding: spacing[3],
    marginTop: spacing[3],
  },
  inlineErrorText: { ...type.body, color: color.error.DEFAULT, textAlign: 'right', writingDirection: 'rtl' },
  savedBanner: {
    backgroundColor: color.success.soft,
    borderWidth: 1,
    borderColor: color.success.DEFAULT,
    borderRadius: radius.md,
    padding: spacing[3],
    marginTop: spacing[3],
  },
  savedText: { ...type.bodyMedium, color: color.success.DEFAULT, textAlign: 'right', writingDirection: 'rtl' },
  bottomSpacer: { height: spacing[2] },
});
