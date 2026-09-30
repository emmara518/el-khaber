/**
 * Merchant Profile screen (M-B) — PUBLIC/store-facing profile,
 * strictly separated from account state.
 *
 * Public: store name, logo, bio, city, verification BADGE (state
 * only — no internal notes). Account (private): edit form, status
 * card with full guidance, onboarding entry for rejected/
 * action_required, settings entry, onboarding CTA when incomplete.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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
import {
  ActionButton,
  AppHeader,
  Avatar,
  Card,
  Icon,
  ListError,
  ListLoading,
  PageTitle,
  SectionHeader,
} from '@/ui';
import { type } from '@/ui/typography';

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
      <View style={styles.root}>
        <AppHeader
          onPressNotifications={() => router.push('/(merchant)/notifications')}
          onPressAvatar={() => router.push('/(merchant)/profile')}
        />
        <ScrollView contentContainerStyle={[styles.content, styles.padded]}>
          <PageTitle eyebrow="ملف المتجر" title={t('merchant.profile.title')} />
          <ListLoading label={t('state.loading')} />
        </ScrollView>
      </View>
    );
  }

  if (vm.loadStatus === 'error' || vm.profile === null) {
    return (
      <View style={styles.root}>
        <AppHeader
          onPressNotifications={() => router.push('/(merchant)/notifications')}
          onPressAvatar={() => router.push('/(merchant)/profile')}
        />
        <ScrollView contentContainerStyle={[styles.content, styles.padded]}>
          <PageTitle eyebrow="ملف المتجر" title={t('merchant.profile.title')} />
          <ListError
            title={t('merchant.profile.loadError')}
            message={vm.loadError?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={vm.reload}
          />
        </ScrollView>
      </View>
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
    <View style={styles.root}>
      <AppHeader
        onPressNotifications={() => router.push('/(merchant)/notifications')}
        onPressAvatar={() => router.push('/(merchant)/profile')}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <PageTitle
          eyebrow="ملف المتجر"
          title={t('merchant.profile.title')}
          body="هويتك التجارية وحالة التوثيق وبيانات التواصل."
        />
      </View>

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
        <ActionButton
          label={t('merchant.profile.updateData')}
          onPress={() => router.push('/(merchant)/onboarding')}
          style={styles.actionGap}
        />
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

      <ActionButton
        variant="secondary"
        icon="edit-2"
        label={t('merchant.profile.edit')}
        onPress={vm.startEdit}
        style={styles.actionGap}
      />
      <ActionButton
        variant="secondary"
        icon="settings"
        label={t('merchant.settings.title')}
        onPress={() => router.push('/(merchant)/settings')}
        style={styles.actionGap}
      />
        <View style={styles.bottomSpacer} />
      </View>
      </ScrollView>
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
  initial: MerchantProfileDraft;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveError: string | null;
  onCancel: () => void;
  onSave: (draft: MerchantProfileDraft) => void;
  onRetry: (draft: MerchantProfileDraft) => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
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
    <View style={styles.root}>
      <AppHeader
        onPressNotifications={() => router.push('/(merchant)/notifications')}
        onPressAvatar={() => router.push('/(merchant)/profile')}
      />
      <ScrollView contentContainerStyle={[styles.content, styles.padded]} showsVerticalScrollIndicator={false}>
      <PageTitle eyebrow="الملف الشخصي" title={t('merchant.profile.editTitle')} />
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
        <ActionButton label={t('merchant.profile.backToProfile')} onPress={onDone} style={styles.actionGap} />
      ) : (
        <View style={styles.formActions}>
          <ActionButton
            label={saveStatus === 'error' ? t('merchant.profile.retrySave') : t('merchant.profile.save')}
            loading={saving}
            loadingLabel="جارٍ الحفظ"
            onPress={saveStatus === 'error' ? () => onRetry(draft) : handleSave}
          />
          <ActionButton
            variant="secondary"
            label={t('merchant.profile.cancel')}
            disabled={saving}
            onPress={onCancel}
          />
        </View>
      )}
      <View style={styles.bottomSpacer} />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle, direction: 'rtl' },
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
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[3],
  },
  title: {
    ...type.h2,
    color: color.text.primary,
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
    ...type.cardTitle,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  muted: {
    ...type.body,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  hero: {
    alignItems: 'center',
    gap: spacing[2],
  },
  name: {
    ...type.h2,
    color: color.surface.base,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  heroMeta: {
    ...type.body,
    color: color.brand.goldSoft,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  heroBadge: {
    ...type.caption,
    color: color.surface.base,
    backgroundColor: color.brand.navyDeep,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    overflow: 'hidden',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  body: {
    ...type.body,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
  },
  meta: {
    ...type.body,
    color: color.text.secondary,
    marginTop: spacing[2],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  center: {
    alignItems: 'center',
    gap: spacing[2],
  },
  stateTitle: {
    ...type.h3,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
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
    ...type.button,
    color: color.surface.base,
    textAlign: 'right',
    writingDirection: 'rtl',
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
    ...type.bodyMedium,
    color: color.brand.navy,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  form: {
    gap: spacing[2],
  },
  formActions: {
    marginTop: spacing[4],
    gap: spacing[3],
  },
  actionGap: {
    marginTop: spacing[4],
  },
  label: {
    ...type.bodyMedium,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: spacing[2],
  },
  input: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    ...type.body,
    color: color.text.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: color.error.DEFAULT,
  },
  fieldError: {
    ...type.caption,
    color: color.error.DEFAULT,
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
    ...type.body,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  cityTextSelected: {
    ...type.bodyMedium,
    color: color.text.primary,
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
  savedBanner: {
    backgroundColor: color.success.soft,
    borderWidth: 1,
    borderColor: color.success.DEFAULT,
    borderRadius: radius.md,
    padding: spacing[3],
    marginTop: spacing[3],
  },
  savedText: {
    ...type.bodyMedium,
    color: color.success.DEFAULT,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
