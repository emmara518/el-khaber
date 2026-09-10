/**
 * Merchant Product Form (M-D) — ONE component for create + edit.
 *
 * Documented fields only: name, description, category (M-C chips),
 * optional price (null → "السعر غير محدد" semantics), and a typed
 * image-intent toggle (no picker/upload — M-C placeholder system).
 * Status is system-owned and never editable here.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  EMPTY_PRODUCT_DRAFT,
  MERCHANT_PRODUCT_CATEGORIES,
  validateProductDraft,
  type MerchantProductDataSource,
  type MerchantProductDraft,
} from './merchant-product-types';
import { sharedMerchantProductsSource } from './mock-merchant-products-data-source';import { useMerchantProductFormViewModel } from './use-merchant-product-form-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { Card } from '@/ui';

export default function MerchantProductFormScreen({
  mode,
  productId = '',
  initial,
  source,
}: {
  mode: 'create' | 'edit';
  productId?: string;
  initial?: MerchantProductDraft;
  source?: MerchantProductDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const vm = useMerchantProductFormViewModel(mode, productId, source ?? sharedMerchantProductsSource);
  const [draft, setDraft] = useState<MerchantProductDraft>(initial ?? EMPTY_PRODUCT_DRAFT);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const submitting = vm.status === 'submitting';
  const savedProduct = vm.saved;

  function patch(p: Partial<MerchantProductDraft>) {
    setDraft((d) => ({ ...d, ...p }));
    setErrors({});
  }

  function handleSubmit() {
    const validation = validateProductDraft(draft);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    vm.save(draft);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {mode === 'create' ? t('merchant.productForm.createTitle') : t('merchant.productForm.editTitle')}
      </Text>

      {vm.status === 'success' && savedProduct !== null ? (
        <View style={styles.form}>
          <Card
            background={color.success.soft}
            borderColor={color.success.DEFAULT}
            padded
            style={styles.center}
          >
            <Text accessibilityRole="alert" style={styles.successTitle}>
              {mode === 'create' ? t('merchant.productForm.created') : t('merchant.productForm.updated')}
            </Text>
            <Text style={styles.muted}>{savedProduct.nameAr}</Text>
          </Card>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('merchant.product.backToCatalog')}
            onPress={() => router.replace('/(merchant)/products')}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>{t('merchant.product.backToCatalog')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('merchant.product.viewDetail')}
            onPress={() =>
              router.replace({ pathname: '/(merchant)/products/[id]', params: { id: savedProduct.id } })
            }
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>{t('merchant.product.viewDetail')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          {vm.status === 'error' ? (
            <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${vm.formError ?? ''}`} style={styles.inlineError}>
              <Text style={styles.inlineErrorText}>{vm.formError}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>{t('merchant.productForm.name')}</Text>
          <TextInput
            accessibilityLabel={errors.nameAr ? `${t('merchant.productForm.name')}. خطأ: ${errors.nameAr}` : t('merchant.productForm.name')}
            placeholder="مثال: غسالة أوتوماتيك سامسونج ١٢ كجم"
            placeholderTextColor={color.text.secondary}
            value={draft.nameAr}
            onChangeText={(text) => patch({ nameAr: text })}
            style={[styles.input, errors.nameAr ? styles.inputError : null]}
            textAlign="right"
            editable={!submitting}
          />
          {errors.nameAr ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>
              {errors.nameAr}
            </Text>
          ) : null}

          <Text style={styles.label}>{t('merchant.productForm.category')}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('merchant.productForm.category')} style={styles.chips}>
            {MERCHANT_PRODUCT_CATEGORIES.map((category) => {
              const selected = draft.categoryAr === category;
              return (
                <Pressable
                  key={category}
                  accessibilityRole="radio"
                  accessibilityLabel={`القسم: ${category}${selected ? '، محدد حاليًا' : ''}`}
                  accessibilityState={{ selected, checked: selected }}
                  onPress={() => patch({ categoryAr: category })}
                  disabled={submitting}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {selected ? '✓ ' : ''}{category}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.categoryAr ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>
              {errors.categoryAr}
            </Text>
          ) : null}

          <Text style={styles.label}>{t('merchant.productForm.description')}</Text>
          <TextInput
            accessibilityLabel={errors.descriptionAr ? `${t('merchant.productForm.description')}. خطأ: ${errors.descriptionAr}` : t('merchant.productForm.description')}
            placeholder="وصف المنتج ومميزاته…"
            placeholderTextColor={color.text.secondary}
            value={draft.descriptionAr}
            onChangeText={(text) => patch({ descriptionAr: text })}
            style={[styles.input, styles.multiline, errors.descriptionAr ? styles.inputError : null]}
            textAlign="right"
            multiline
            numberOfLines={4}
            editable={!submitting}
          />
          {errors.descriptionAr ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>
              {errors.descriptionAr}
            </Text>
          ) : null}

          <Text style={styles.label}>{t('merchant.productForm.price')}</Text>
          <TextInput
            accessibilityLabel={errors.priceSar ? `${t('merchant.productForm.price')}. خطأ: ${errors.priceSar}` : t('merchant.productForm.price')}
            placeholder={t('merchant.productForm.pricePlaceholder')}
            placeholderTextColor={color.text.secondary}
            value={draft.priceSar === null ? '' : String(draft.priceSar)}
            onChangeText={(text) => {
              const n = Number(text.replace(/[^0-9]/g, ''));
              patch({ priceSar: text.trim().length === 0 ? null : n });
            }}
            keyboardType="numeric"
            style={[styles.input, errors.priceSar ? styles.inputError : null]}
            textAlign="right"
            editable={!submitting}
          />
          <Text style={styles.optional}>{t('merchant.productForm.priceOptional')}</Text>
          {errors.priceSar ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>
              {errors.priceSar}
            </Text>
          ) : null}

          <Text style={styles.label}>{t('merchant.productForm.image')}</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel={t('merchant.productForm.image')}
            accessibilityState={{ checked: draft.imageSelected, disabled: submitting }}
            onPress={() => patch({ imageSelected: !draft.imageSelected })}
            disabled={submitting}
            style={({ pressed }) => [
              styles.imageToggle,
              draft.imageSelected && styles.chipSelected,
              pressed && !submitting && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, draft.imageSelected && styles.chipTextSelected]}>
              🖼️ {draft.imageSelected ? t('merchant.productForm.imageOn') : t('merchant.productForm.imageOff')}
            </Text>
          </Pressable>
          <Text style={styles.optional}>{t('merchant.productForm.imageNote')}</Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={mode === 'create' ? t('merchant.productForm.createSubmit') : t('merchant.productForm.editSubmit')}
              accessibilityState={{ disabled: submitting, busy: submitting }}
              onPress={vm.status === 'error' ? () => vm.retry(draft) : handleSubmit}
              disabled={submitting}
              style={({ pressed }) => [styles.primary, submitting && styles.disabled, pressed && !submitting && styles.pressed]}
            >
              {submitting ? (
                <ActivityIndicator accessibilityLabel="جارٍ حفظ المنتج" color={color.surface.base} />
              ) : (
                <Text style={styles.primaryText}>
                  {vm.status === 'error'
                    ? t('merchant.productForm.retry')
                    : mode === 'create'
                      ? t('merchant.productForm.createSubmit')
                      : t('merchant.productForm.editSubmit')}
                </Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('merchant.profile.cancel')}
              onPress={() => router.back()}
              disabled={submitting}
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>{t('merchant.profile.cancel')}</Text>
            </Pressable>
          </View>
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
  form: {
    gap: spacing[2],
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.pill,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: color.brand.gold,
    borderWidth: 2,
    backgroundColor: color.brand.goldSoft,
  },
  chipText: {
    color: color.text.secondary,
    fontSize: typography.size.body,
  },
  chipTextSelected: {
    color: color.text.primary,
    fontWeight: typography.weight.bold,
  },
  imageToggle: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
    justifyContent: 'center',
  },
  optional: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
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
  actions: {
    marginTop: spacing[4],
  },
  primary: {
    backgroundColor: color.brand.navy,
    borderRadius: radius.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
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
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
  },
  secondaryText: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  center: {
    alignItems: 'center',
    gap: spacing[2],
  },
  successTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  muted: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
