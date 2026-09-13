/**
 * Technician profile screen (T-B).
 *
 * - approved → full profile view + edit mode (view/edit/cancel/
 *   save + validation + loading/error/success),
 * - pending → status card + read-only summary,
 * - rejected / action_required → status card + "تحديث البيانات"
 *   entry into the prefilled onboarding flow.
 * Edit form reuses the onboarding's shared selectors. Rating and
 * counts are server-owned display values, never editable.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { LabeledInput, MultiSelectChips } from './components/profile-selectors';
import { ApiTechnicianProfileDataSource } from './api-technician-profile-data-source';
import {
  APPLIANCE_OPTIONS,
  AREA_OPTIONS,
  SERVICE_OPTIONS,
  SPECIALTY_OPTIONS,
  draftFromProfile,
  validateProfileDraft,
  verificationStatusCopy,
  type TechnicianProfileDataSource,
  type TechnicianProfileDraft,
} from './technician-profile-types';
import { useTechnicianProfileViewModel } from './use-technician-profile-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, Card, RatingStars, SectionHeader } from '@/ui';

export default function TechnicianProfileScreen({
  source,
}: {
  source?: TechnicianProfileDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useTechnicianProfileViewModel(source ?? new ApiTechnicianProfileDataSource());

  if (vm.loadStatus === 'loading') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('tech.profile.title')}
        </Text>
        <Text style={styles.muted}>{t('state.loading')}</Text>
      </ScrollView>
    );
  }

  if (vm.loadStatus === 'error' || vm.profile === null) {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('tech.profile.title')}
        </Text>
        <Card background={color.surface.base} padded style={styles.center}>
          <Text accessibilityRole="alert" style={styles.stateTitle}>
            {t('tech.profile.loadError')}
          </Text>
          <Text style={styles.muted}>{vm.loadError?.message ?? ''}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('state.retry')}
            onPress={vm.reload}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>{t('state.retry')}</Text>
          </Pressable>
        </Card>
      </ScrollView>
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
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('tech.profile.title')}
      </Text>

      <Card
        background={profile.verification === 'approved' ? color.success.soft : color.brand.goldSoft}
        borderColor={profile.verification === 'approved' ? color.success.DEFAULT : color.brand.gold}
        padded
        style={styles.statusCard}
      >
        <Text style={styles.statusIcon}>{status.icon}</Text>
        <View style={styles.statusText}>
          <Text
            accessibilityLabel={`حالة التوثيق: ${status.titleAr}. ${status.bodyAr}`}
            style={styles.statusTitle}
          >
            {status.titleAr}
          </Text>
          <Text style={styles.muted}>{profile.verificationNoteAr || status.bodyAr}</Text>
        </View>
      </Card>

      {(profile.verification === 'rejected' || profile.verification === 'action_required') && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tech.profile.updateData')}
          onPress={() =>
            router.push({
              pathname: '/(technician)/onboarding',
              params: { resume: '1' },
            })
          }
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{t('tech.profile.updateData')}</Text>
        </Pressable>
      )}

      <Card background={color.brand.navy} borderColor={color.brand.navy} padded style={styles.hero}>
        <Avatar
          initials={profile.initialsAr}
          size={72}
          background={color.brand.gold}
          foreground={color.brand.navy}
          accessibilityLabel={`الصورة الرمزية لـ ${profile.displayNameAr}`}
        />
        <Text style={styles.name}>{profile.displayNameAr}</Text>
        <Text style={styles.heroMeta}>{profile.specialtiesAr.join(' · ') || '—'}</Text>
        <RatingStars rating={profile.rating} reviewCount={profile.reviewCount} />
      </Card>

      <SectionHeader titleKey="tech.profile.about" />
      <Card background={color.surface.base} padded>
        <Text style={styles.body}>{profile.bioAr || '—'}</Text>
        <Text style={styles.meta}>
          {t('tech.profile.phone')}: {profile.phoneAr || '—'}
        </Text>
        <Text style={styles.meta}>
          {t('tech.profile.experience')}:{' '}
          {profile.experienceYears === null ? '—' : `${profile.experienceYears} سنوات`}
        </Text>
        <Text style={styles.meta}>
          {t('tech.profile.completed')}: {profile.completedCount}
        </Text>
      </Card>

      <SectionHeader titleKey="tech.profile.appliances" />
      <ChipRow items={profile.appliances.map((s) => APPLIANCE_OPTIONS.find((a) => a.slug === s)?.titleAr ?? s)} emptyLabel="—" />

      <SectionHeader titleKey="tech.profile.services" />
      <ChipRow items={profile.servicesAr} emptyLabel={t('tech.profile.emptyServices')} />

      <SectionHeader titleKey="tech.profile.areas" />
      <ChipRow items={profile.areasAr} emptyLabel={t('tech.profile.emptyAreas')} />

      {profile.verification === 'approved' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tech.profile.edit')}
          onPress={vm.startEdit}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{t('tech.profile.edit')}</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tech.settings.title')}
        onPress={() => router.push('/(technician)/settings')}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>⚙️ {t('tech.settings.title')}</Text>
      </Pressable>
      <View style={styles.bottomSpacer} />
    </ScrollView>
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
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('tech.profile.editTitle')}
      </Text>
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
          label={t('tech.profile.specialties')}
          options={SPECIALTY_OPTIONS}
          selected={draft.specialtiesAr}
          onToggle={(value) =>
            patch({
              specialtiesAr: draft.specialtiesAr.includes(value)
                ? draft.specialtiesAr.filter((v) => v !== value)
                : [...draft.specialtiesAr, value],
            })
          }
          error={errors.specialtiesAr}
        />
        <MultiSelectChips
          label={t('tech.profile.appliances')}
          options={APPLIANCE_OPTIONS.map((a) => a.titleAr)}
          selected={draft.appliances.map((s) => APPLIANCE_OPTIONS.find((a) => a.slug === s)?.titleAr ?? s)}
          onToggle={(title) => {
            const found = APPLIANCE_OPTIONS.find((a) => a.titleAr === title);
            if (!found) return;
            patch({
              appliances: draft.appliances.includes(found.slug)
                ? draft.appliances.filter((v) => v !== found.slug)
                : [...draft.appliances, found.slug],
            });
          }}
          error={errors.appliances}
        />
        <MultiSelectChips
          label={t('tech.profile.services')}
          options={SERVICE_OPTIONS}
          selected={draft.servicesAr}
          onToggle={(value) =>
            patch({
              servicesAr: draft.servicesAr.includes(value)
                ? draft.servicesAr.filter((v) => v !== value)
                : [...draft.servicesAr, value],
            })
          }
          error={errors.servicesAr}
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tech.profile.backToProfile')}
          onPress={onDone}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{t('tech.profile.backToProfile')}</Text>
        </Pressable>
      ) : (
      <View style={styles.formActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tech.profile.save')}
          accessibilityState={{ disabled: saving, busy: saving }}
          onPress={saveStatus === 'error' ? () => onRetry(draft) : handleSave}
          disabled={saving}
          style={({ pressed }) => [styles.primary, saving && styles.disabled, pressed && !saving && styles.pressed]}
        >
          {saving ? (
            <ActivityIndicator accessibilityLabel="جارٍ الحفظ" color={color.surface.base} />
          ) : (
            <Text style={styles.primaryText}>
              {saveStatus === 'error' ? t('tech.profile.retrySave') : t('tech.profile.save')}
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('tech.profile.cancel')}
          onPress={onCancel}
          disabled={saving}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{t('tech.profile.cancel')}</Text>
        </Pressable>
      </View>
      )}
      <View style={styles.bottomSpacer} />
    </ScrollView>
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
    marginBottom: spacing[4],
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  statusIcon: {
    fontSize: 28,
    fontWeight: typography.weight.bold,
  },
  statusText: {
    flex: 1,
    gap: spacing[1],
  },
  statusTitle: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  muted: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hero: {
    alignItems: 'center',
    gap: spacing[2],
  },
  name: {
    color: color.surface.base,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
  },
  heroMeta: {
    color: color.brand.goldSoft,
    fontSize: typography.size.body,
  },
  body: {
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  meta: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[2],
    textAlign: 'right',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    backgroundColor: color.surface.base,
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  chipText: {
    color: color.text.primary,
    fontSize: typography.size.body,
  },
  center: {
    alignItems: 'center',
    gap: spacing[2],
  },
  stateTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
  },
  primary: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  primaryText: {
    color: color.surface.base,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
  },
  secondary: {
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
  },
  secondaryText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  form: {
    gap: spacing[4],
  },
  formActions: {
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
  savedBanner: {
    backgroundColor: color.success.soft,
    borderWidth: 1,
    borderColor: color.success.DEFAULT,
    borderRadius: radius.md,
    padding: spacing[3],
    marginTop: spacing[3],
  },
  savedText: {
    color: color.success.DEFAULT,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
    textAlign: 'right',
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
