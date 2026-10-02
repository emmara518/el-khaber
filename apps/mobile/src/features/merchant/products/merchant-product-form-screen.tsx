/**
 * Merchant Product Form (M-D) — ONE component for create + edit.
 *
 * Documented fields only: name, description, optional price (null →
 * "السعر غير محدد" semantics), optional stock, and an optional product
 * `image_url` with a live preview of what will be shown. Status is
 * system-owned and never editable here.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { sharedMerchantProductsSource } from './api-merchant-products-data-source';
import {
  EMPTY_PRODUCT_DRAFT,
  validateProductDraft,
  type MerchantProductDataSource,
  type MerchantProductDraft,
} from './merchant-product-types';
import { useMerchantProductFormViewModel } from './use-merchant-product-form-view-model';

import { useI18n } from '@/i18n/use-i18n';
import { AppHeader, Card, FormField, PageTitle, ProductImage } from '@/ui';
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

          <FormField
            label={t('merchant.productForm.name')}
            placeholder="مثال: غسالة أوتوماتيك سامسونج ١٢ كجم"
            value={draft.nameAr}
            onChangeText={(text) => patch({ nameAr: text })}
            error={errors.nameAr}
            editable={!submitting}
          />

          <FormField
            label={t('merchant.productForm.description')}
            placeholder="وصف المنتج ومميزاته…"
            value={draft.descriptionAr}
            onChangeText={(text) => patch({ descriptionAr: text })}
            error={errors.descriptionAr}
            multiline
            numberOfLines={4}
            editable={!submitting}
          />

          <FormField
            label={t('merchant.productForm.price')}
            placeholder={t('merchant.productForm.pricePlaceholder')}
            value={draft.price === null ? '' : String(draft.price)}
            onChangeText={(text) => {
              const n = Number(text.replace(/[^0-9]/g, ''));
              patch({ price: text.trim().length === 0 ? null : n });
            }}
            keyboardType="numeric"
            error={errors.price}
            hint={t('merchant.productForm.priceOptional')}
            editable={!submitting}
          />

          <FormField
            label={t('merchant.productForm.stock')}
            placeholder={t('merchant.productForm.stockPlaceholder')}
            value={draft.stockQuantity === null ? '' : String(draft.stockQuantity)}
            onChangeText={(text) => {
              const n = Number(text.replace(/[^0-9]/g, ''));
              patch({ stockQuantity: text.trim().length === 0 ? null : n });
            }}
            keyboardType="numeric"
            error={errors.stockQuantity}
            hint={t('merchant.productForm.stockOptional')}
            editable={!submitting}
          />

          <FormField
            label={t('merchant.productForm.image')}
            placeholder="https://… رابط صورة المنتج (اختياري)"
            value={draft.imageUrl}
            onChangeText={(text) => patch({ imageUrl: text })}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={errors.imageUrl}
            hint={t('merchant.productForm.imageNote')}
            editable={!submitting}
          />
          <View style={styles.imagePreview}>
            <ProductImage
              imageUrl={draft.imageUrl.trim().length > 0 ? draft.imageUrl.trim() : null}
              nameAr={draft.nameAr.trim().length > 0 ? draft.nameAr.trim() : t('merchant.productForm.name')}
              size={112}
            />
          </View>

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
  imagePreview: {
    alignItems: 'flex-start',
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
