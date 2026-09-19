/**
 * Merchant Profile screen (M-B) — PUBLIC/store-facing profile,
 * strictly separated from account state.
 *
 * Public: store name, logo, bio, city, verification BADGE (state
 * only — no internal notes). Account (private): edit form, status
 * card with full guidance, onboarding entry for rejected/
 * action_required, settings entry, onboarding CTA when incomplete.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  MERCHANT_CITY_OPTIONS,
  draftFromMerchantProfile,
  merchantVerificationStatusCopy,
  validateMerchantDraft,
  type MerchantProfileDataSource,
  type MerchantProfileDraft,
} from './merchant-profile-types';
import { useMerchantProfileViewModel } from './use-merchant-profile-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { Avatar, Card, Icon, SectionHeader } from '@/ui';
import { SceneHero } from '@/ui/cinematic';

export default function MerchantProfileScreen({
  source,
}: {
  source?: MerchantProfileDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useMerchantProfileViewModel(source);

  if (vm.loadStatus === 'loading') {
    return (
      <ScrollView contentContainerStyle={[styles.content, styles.padded]}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('merchant.profile.title')}
        </Text>
        <Text style={styles.muted}>{t('state.loading')}</Text>
      </ScrollView>
    );
  }

  if (vm.loadStatus === 'error' || vm.profile === null) {
    return (
      <ScrollView contentContainerStyle={[styles.content, styles.padded]}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('merchant.profile.title')}
        </Text>
        <Card background={color.surface.base} padded style={styles.center}>
          <Text accessibilityRole="alert" style={styles.stateTitle}>
            {t('merchant.profile.loadError')}
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
  const status = merchantVerificationStatusCopy(profile.verification);

  if (vm.editing) {
    return (
      <ProfileEditForm
        key={profile.businessNameAr}
        initial={draftFromMerchantProfile(profile)}
        saveStatus={vm.saveStatus}
        saveError={vm.saveError}
        onCancel={vm.cancelEdit}
        onSave={vm.save}
        onRetry={vm.retrySave}
        onDone={vm.cancelEdit}
      />
    );
  }

  const needsUpdate =
    profile.verification === 'rejected' || profile.verification === 'action_required';

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SceneHero
        compact
        asset="merchant_dashboard_hero"
        eyebrow="ملف المتجر"
        title={t('merchant.profile.title')}
        body="هويتك التجارية وحالة التوثيق وبيانات التواصل."
      />

      <View style={styles.editorial}>
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
          <Text
            accessibilityLabel={`حالة التوثيق: ${status.titleAr}. ${status.bodyAr}`}
            style={styles.statusTitle}
          >
            {status.titleAr}
          </Text>
          <Text style={styles.muted}>{profile.verificationNoteAr || status.bodyAr}</Text>
        </View>
      </Card>

      {needsUpdate ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('merchant.profile.updateData')}
          onPress={() => router.push('/(merchant)/onboarding')}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{t('merchant.profile.updateData')}</Text>
        </Pressable>
      ) : null}

      <Card background={color.brand.navy} borderColor={color.brand.navy} padded style={styles.hero}>
        <Avatar
          initials={profile.initialsAr}
          size={72}
          background={color.brand.gold}
          foreground={color.brand.navy}
          accessibilityLabel={`شعار ${profile.businessNameAr}`}
        />
        <Text style={styles.name}>{profile.businessNameAr}</Text>
        <Text style={styles.heroMeta}>{profile.cityAr}</Text>
        <Text style={styles.heroBadge}>{status.titleAr}</Text>
      </Card>

      <SectionHeader titleKey="merchant.profile.about" />
      <Card background={color.surface.base} padded>
        <Text style={styles.body}>{profile.bioAr || '—'}</Text>
        <Text style={styles.meta}>
          {t('merchant.profile.phone')}: {profile.phoneAr || '—'}
        </Text>
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('merchant.profile.edit')}
        onPress={vm.startEdit}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>{t('merchant.profile.edit')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('merchant.settings.title')}
        onPress={() => router.push('/(merchant)/settings')}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Icon name="settings" size={18} color={color.brand.navy} />
        <Text style={styles.secondaryText}>{t('merchant.settings.title')}</Text>
      </Pressable>
        <View style={styles.bottomSpacer} />
      </View>
    </ScrollView>
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
  initial: MerchantProfileDraft;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveError: string | null;
  onCancel: () => void;
  onSave: (draft: MerchantProfileDraft) => void;
  onRetry: (draft: MerchantProfileDraft) => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<MerchantProfileDraft>(initial);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const saving = saveStatus === 'saving';

  function patch(p: Partial<MerchantProfileDraft>) {
    setDraft((d) => ({ ...d, ...p }));
    setErrors({});
  }

  function handleSave() {
    const validation = validateMerchantDraft(draft);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    onSave(draft);
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, styles.padded]} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('merchant.profile.editTitle')}
      </Text>
      <View style={styles.form}>
        <Text style={styles.label}>{t('merchant.profile.name')}</Text>
        <TextInput
          accessibilityLabel={errors.businessNameAr ? `${t('merchant.profile.name')}. خطأ: ${errors.businessNameAr}` : t('merchant.profile.name')}
          value={draft.businessNameAr}
          onChangeText={(text) => patch({ businessNameAr: text })}
          style={[styles.input, errors.businessNameAr ? styles.inputError : null]}
          textAlign="right"
        />
        {errors.businessNameAr ? (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {errors.businessNameAr}
          </Text>
        ) : null}

        <Text style={styles.label}>{t('merchant.profile.city')}</Text>
        <View accessibilityRole="radiogroup" accessibilityLabel={t('merchant.profile.city')} style={styles.cities}>
          {MERCHANT_CITY_OPTIONS.map((city) => {
            const selected = draft.cityAr === city;
            return (
              <Pressable
                key={city}
                accessibilityRole="radio"
                accessibilityLabel={`المدينة: ${city}${selected ? '، محددة حاليًا' : ''}`}
                accessibilityState={{ selected, checked: selected }}
                onPress={() => patch({ cityAr: city })}
                style={({ pressed }) => [
                  styles.cityChip,
                  selected && styles.cityChipSelected,
                  pressed && styles.pressed,
                ]}
              >
                {selected ? (
                  <Icon name="check" size={14} color={color.surface.base} />
                ) : null}
                <Text style={[styles.cityText, selected && styles.cityTextSelected]}>
                  {city}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.cityAr ? (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {errors.cityAr}
          </Text>
        ) : null}

        <Text style={styles.label}>{t('merchant.profile.bio')}</Text>
        <TextInput
          accessibilityLabel={t('merchant.profile.bio')}
          value={draft.bioAr}
          onChangeText={(text) => patch({ bioAr: text })}
          style={[styles.input, styles.multiline]}
          textAlign="right"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>{t('merchant.profile.phone')}</Text>
        <TextInput
          accessibilityLabel={errors.phoneAr ? `${t('merchant.profile.phone')}. خطأ: ${errors.phoneAr}` : t('merchant.profile.phone')}
          value={draft.phoneAr}
          onChangeText={(text) => patch({ phoneAr: text })}
          keyboardType="phone-pad"
          style={[styles.input, errors.phoneAr ? styles.inputError : null]}
          textAlign="right"
        />
        {errors.phoneAr ? (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {errors.phoneAr}
          </Text>
        ) : null}
      </View>
      {saveStatus === 'error' ? (
        <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${saveError ?? ''}`} style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{saveError}</Text>
        </View>
      ) : null}
      {saveStatus === 'saved' ? (
        <View accessibilityRole="alert" style={styles.savedBanner}>
          <Text style={styles.savedText}>{t('merchant.profile.saved')}</Text>
        </View>
      ) : null}
      {saveStatus === 'saved' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('merchant.profile.backToProfile')}
          onPress={onDone}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{t('merchant.profile.backToProfile')}</Text>
        </Pressable>
      ) : (
        <View style={styles.formActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('merchant.profile.save')}
            accessibilityState={{ disabled: saving, busy: saving }}
            onPress={saveStatus === 'error' ? () => onRetry(draft) : handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.primary, saving && styles.disabled, pressed && !saving && styles.pressed]}
          >
            {saving ? (
              <ActivityIndicator accessibilityLabel="جارٍ الحفظ" color={color.surface.base} />
            ) : (
              <Text style={styles.primaryText}>
                {saveStatus === 'error' ? t('merchant.profile.retrySave') : t('merchant.profile.save')}
              </Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('merchant.profile.cancel')}
            onPress={onCancel}
            disabled={saving}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>{t('merchant.profile.cancel')}</Text>
          </Pressable>
        </View>
      )}
      <View style={styles.bottomSpacer} />
    </ScrollView>
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
  statusIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  heroMeta: {
    color: color.brand.goldSoft,
    fontSize: typography.size.body,
  },
  heroBadge: {
    color: color.surface.base,
    backgroundColor: color.brand.navyDeep,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    fontSize: typography.size.caption,
    overflow: 'hidden',
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
    flexDirection: 'row',
    gap: spacing[2],
  },
  secondaryText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  form: {
    gap: spacing[2],
  },
  formActions: {
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
