/**
 * Merchant Product Form (M-D) — ONE component for create + edit.
 *
 * Documented fields only: name, description, category (M-C chips),
 * optional price (null → "السعر غير محدد" semantics), and a typed
 * image-intent toggle (no picker/upload — M-C placeholder system).
 * Status is system-owned and never editable here.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { sharedMerchantProductsSource } from './api-merchant-products-data-source';
import {
  EMPTY_PRODUCT_DRAFT,
  validateProductDraft,
  type MerchantProductDataSource,
  type MerchantProductDraft,
} from './merchant-product-types';
import { useMerchantProductFormViewModel } from './use-merchant-product-form-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { AppHeader, Card, PageTitle } from '@/ui';
import { BrandImage } from '@/ui/brand-image';
import { type } from '@/ui/typography';

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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <AppHeader
      onPressNotifications={() => router.push('/(merchant)/notifications')}
      onPressAvatar={() => router.push('/(merchant)/profile')}
    />
    <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <PageTitle
          eyebrow="المتجر · المنتجات"
          title={mode === 'create' ? t('merchant.productForm.createTitle') : t('merchant.productForm.editTitle')}
          body={mode === 'create' ? 'أضف منتجًا جديدًا ليظهر داخل كتالوج متجرك.' : 'حدّث بيانات المنتج مع الحفاظ على حالة الظهور الحالية.'}
        />
      </View>

      {vm.status === 'success' && savedProduct !== null ? (
        <View style={styles.form}>
          <View style={styles.successScene}>
            <BrandImage name="success" size={116} />
          </View>
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
            accessibilityLabel={errors.price ? `${t('merchant.productForm.price')}. خطأ: ${errors.price}` : t('merchant.productForm.price')}
            placeholder={t('merchant.productForm.pricePlaceholder')}
            placeholderTextColor={color.text.secondary}
            value={draft.price === null ? '' : String(draft.price)}
            onChangeText={(text) => {
              const n = Number(text.replace(/[^0-9]/g, ''));
              patch({ price: text.trim().length === 0 ? null : n });
            }}
            keyboardType="numeric"
            style={[styles.input, errors.price ? styles.inputError : null]}
            textAlign="right"
            editable={!submitting}
          />
          <Text style={styles.optional}>{t('merchant.productForm.priceOptional')}</Text>
          {errors.price ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>
              {errors.price}
            </Text>
          ) : null}

          <Text style={styles.label}>{t('merchant.productForm.stock')}</Text>
          <TextInput
            accessibilityLabel={errors.stockQuantity ? `${t('merchant.productForm.stock')}. خطأ: ${errors.stockQuantity}` : t('merchant.productForm.stock')}
            placeholder={t('merchant.productForm.stockPlaceholder')}
            placeholderTextColor={color.text.secondary}
            value={draft.stockQuantity === null ? '' : String(draft.stockQuantity)}
            onChangeText={(text) => {
              const n = Number(text.replace(/[^0-9]/g, ''));
              patch({ stockQuantity: text.trim().length === 0 ? null : n });
            }}
            keyboardType="numeric"
            style={[styles.input, errors.stockQuantity ? styles.inputError : null]}
            textAlign="right"
            editable={!submitting}
          />
          <Text style={styles.optional}>{t('merchant.productForm.stockOptional')}</Text>
          {errors.stockQuantity ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>
              {errors.stockQuantity}
            </Text>
          ) : null}

          <Text style={styles.label}>{t('merchant.productForm.image')}</Text>
          <TextInput
            accessibilityLabel={errors.imageUrl ? `${t('merchant.productForm.image')}. خطأ: ${errors.imageUrl}` : t('merchant.productForm.image')}
            placeholder="https://… رابط صورة المنتج (اختياري)"
            placeholderTextColor={color.text.secondary}
            value={draft.imageUrl}
            onChangeText={(text) => patch({ imageUrl: text })}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[styles.input, errors.imageUrl ? styles.inputError : null]}
            textAlign="right"
            editable={!submitting}
          />
          <Text style={styles.optional}>{t('merchant.productForm.imageNote')}</Text>
          {errors.imageUrl ? (
            <Text accessibilityRole="alert" style={styles.fieldError}>
              {errors.imageUrl}
            </Text>
          ) : null}

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.surface.subtle, direction: 'rtl' },
  content: {
    direction: 'rtl',
    paddingBottom: spacing[8],
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
    paddingBottom: spacing[3],
  },
  successScene: {
    width: '100%',
    height: 150,
    borderRadius: radius.lg,
    backgroundColor: color.surface.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
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
  chips: {
    flexDirection: 'row',
    direction: 'rtl',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1] + 2,
  },
  chipSelected: {
    borderColor: color.brand.navy,
    borderWidth: 2,
    backgroundColor: color.surface.base,
  },
  chipText: {
    ...type.body,
    color: color.text.secondary,
    writingDirection: 'rtl',
  },
  chipTextSelected: {
    ...type.bodyMedium,
    color: color.text.primary,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  optional: {
    ...type.caption,
    color: color.text.secondary,
    textAlign: 'right',
    writingDirection: 'rtl',
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
    ...type.button,
    color: color.surface.base,
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
    ...type.bodyMedium,
    color: color.brand.navy,
  },
  center: {
    alignItems: 'center',
    gap: spacing[2],
  },
  successTitle: {
    ...type.h3,
    color: color.text.primary,
    textAlign: 'center',
  },
  muted: {
    ...type.body,
    color: color.text.secondary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
