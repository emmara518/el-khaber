/**
 * Merchant Product Details screen (M-C + M-D).
 * Typed product id; shows documented fields only (name, category,
 * description, status, optional price, image placeholder). M-D adds
 * the تعديل المنتج CTA and the documented suspend/activate control
 * with confirmation — no delete (not in the docs).
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { findMerchantProduct } from './merchant-product-types';
import { useMerchantProductsViewModel } from './use-merchant-products-view-model';

import type { MerchantProductStatus } from './merchant-product-types';
import type { MerchantProductsDataSource } from './mock-merchant-products-data-source';

import { useI18n } from '@/i18n/use-i18n';
import {
  ActionButton,
  AppHeader,
  Card,
  ListEmpty,
  ListError,
  ListLoading,
  PageTitle,
  ProductImage,
  SectionHeading,
  StatusBadge,
  type,
} from '@/ui';

export default function MerchantProductDetailScreen({
  productId,
  source,
}: {
  productId: string;
  source?: MerchantProductsDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const {
    status,
    data,
    error,
    retry,
    mutationStatus,
    mutationError,
    mutationResult,
    setProductStatus,
    resetMutation,
    deleteStatus,
    deleteError,
    deleteProduct,
    resetDelete,
  } = useMerchantProductsViewModel(source);
  void resetMutation;
  void resetDelete;

  // A server-confirmed delete removes the product from local state, so the
  // row disappears before the not-found guard below can render. Leave for
  // the catalog immediately instead of flashing a false "not found" state.
  useEffect(() => {
    if (deleteStatus === 'success') {
      router.replace('/(merchant)/products');
    }
  }, [deleteStatus, router]);

  const header = (
    <AppHeader
      onPressNotifications={() => router.push('/(merchant)/notifications')}
      onPressAvatar={() => router.push('/(merchant)/profile')}
    />
  );

  if (status === 'loading') {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <PageTitle eyebrow="المتجر · المنتجات" title={t('merchant.product.title')} />
          <ListLoading label={t('state.loading')} />
        </ScrollView>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <PageTitle eyebrow="المتجر · المنتجات" title={t('merchant.product.title')} />
          <ListError
            title={t('merchant.catalog.error')}
            message={error?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={retry}
          />
        </ScrollView>
      </View>
    );
  }

  const product = data !== null ? findMerchantProduct(data, productId) : null;
  if (!product) {
    return (
      <View style={styles.root}>
        {header}
        <ScrollView contentContainerStyle={styles.content}>
          <ListEmpty
            icon="package"
            iconLabel="منتج غير موجود"
            title={t('merchant.product.missing')}
            body={t('merchant.product.missingBody')}
            actionLabel={t('merchant.product.backToCatalog')}
            onAction={() => router.replace('/(merchant)/products')}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {header}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <PageTitle
          eyebrow={`منتج ${product.id} · ${product.statusLabelAr}`}
          title={product.nameAr}
          body={`${t('merchant.product.ref')}: ${product.id}`}
        />
        <View style={styles.heroMetaRow}>
          {product.price !== null ? (
            <Text style={styles.heroPrice}>{product.price} جنيه</Text>
          ) : (
            <Text style={styles.heroNoPrice}>{t('merchant.catalog.noPrice')}</Text>
          )}
        </View>
        <ActionButton
          label={t('merchant.product.edit')}
          icon="edit-3"
          onPress={() => router.push({ pathname: '/(merchant)/products/[id]/edit', params: { id: product.id } })}
        />
      </View>

      <View style={styles.section}>
        <SectionHeading title={t('merchant.product.description')} body={product.descriptionAr} />
        <View style={styles.showcase}>
          <ProductImage imageUrl={product.imageUrl} nameAr={product.nameAr} size={120} />
          <View style={styles.showcaseMeta}>
            <StatusBadge status={product.status} label={product.statusLabelAr} />
            {product.stockQuantity !== null ? (
              <Text style={styles.stockLine}>
                {t('merchant.product.stock')}: {product.stockQuantity}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <ProductActions
        productId={product.id}
        status={product.status}
        mutationStatus={mutationStatus}
        mutationError={mutationError}
        mutationResult={mutationResult}
        setProductStatus={setProductStatus}
        deleteStatus={deleteStatus}
        deleteError={deleteError}
        onDelete={deleteProduct}
        onBackToList={() => router.replace('/(merchant)/products')}
      />
      <View style={styles.bottomSpacer} />
    </ScrollView>
    </View>
  );
}

function ProductActions({
  productId,
  status,
  mutationStatus,
  mutationError,
  mutationResult,
  setProductStatus,
  deleteStatus,
  deleteError,
  onDelete,
  onBackToList,
}: {
  productId: string;
  status: MerchantProductStatus;
  mutationStatus: 'idle' | 'submitting' | 'success' | 'error';
  mutationError: string | null;
  mutationResult: MerchantProductStatus extends never ? never : import('./merchant-product-types').MerchantProduct | null;
  setProductStatus: (productId: string, status: MerchantProductStatus) => void;
  deleteStatus: 'idle' | 'submitting' | 'success' | 'error';
  deleteError: string | null;
  onDelete: (productId: string) => void;
  onBackToList: () => void;
}) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const busy = mutationStatus === 'submitting' || deleteStatus === 'submitting';
  const nextStatus: MerchantProductStatus | null = status === 'active' ? 'suspended' : status === 'suspended' ? 'active' : null;

  // Deletion navigation is owned by the screen (it leaves for the catalog on
  // success, before the not-found guard can render). This block only reflects
  // that a delete is in flight.
  useEffect(() => {
    if (deleteStatus === 'submitting') {
      setDeleting(true);
    }
  }, [deleteStatus]);

  return (
    <View>
      {nextStatus !== null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            nextStatus === 'suspended'
              ? t('merchant.product.suspend')
              : t('merchant.product.activate')
          }
          onPress={() => {
            if (nextStatus === 'suspended') {
              setConfirming(true);
            } else {
              setProductStatus(productId, 'active');
            }
          }}
          disabled={busy}
          style={({ pressed }) => [styles.warn, busy && styles.disabled, pressed && !busy && styles.pressed]}
        >
          {busy ? (
            <ActivityIndicator accessibilityLabel="جارٍ تحديث حالة المنتج" color={color.brand.navy} />
          ) : (
            <Text style={styles.warnText}>
              {nextStatus === 'suspended' ? t('merchant.product.suspend') : t('merchant.product.activate')}
            </Text>
          )}
        </Pressable>
      ) : null}

      {mutationError !== null ? (
        <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${mutationError}`} style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{mutationError}</Text>
        </View>
      ) : null}
      {mutationStatus === 'success' && mutationResult !== null ? (
        <Card
          background={color.success.soft}
          borderColor={color.success.DEFAULT}
          padded
          style={styles.successCard}
        >
          <Text accessibilityRole="alert" style={styles.statusTitle}>
            {mutationResult.status === 'active'
              ? t('merchant.product.activated')
              : t('merchant.product.suspendedDone')}
          </Text>
        </Card>
      ) : null}

      <Modal
        visible={confirming}
        transparent
        animationType="fade"
        accessibilityLabel={t('merchant.product.confirmSuspend')}
        onRequestClose={() => setConfirming(false)}
      >
        <View style={styles.scrim}>
          <Card background={color.surface.base} padded style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.dialogTitle}>
              {t('merchant.product.confirmSuspend')}
            </Text>
            <Text style={styles.body}>{t('merchant.product.confirmSuspendBody')}</Text>
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('merchant.product.confirmSuspendYes')}
                onPress={() => {
                  setConfirming(false);
                  setProductStatus(productId, 'suspended');
                }}
                style={({ pressed }) => [styles.warnSolid, pressed && styles.pressed]}
              >
                <Text style={styles.warnSolidText}>{t('merchant.product.confirmSuspendYes')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('merchant.product.confirmSuspendNo')}
                onPress={() => setConfirming(false)}
                style={({ pressed }) => [styles.secondaryInline, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>{t('merchant.product.confirmSuspendNo')}</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
      {deleteError !== null ? (
        <View accessibilityRole="alert" accessibilityLabel={`خطأ: ${deleteError}`} style={styles.inlineError}>
          <Text style={styles.inlineErrorText}>{deleteError}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="حذف المنتج"
        accessibilityState={{ disabled: busy, busy: deleteStatus === 'submitting' }}
        onPress={() => setDeleting(true)}
        disabled={busy}
        style={({ pressed }) => [styles.destructive, busy && styles.disabled, pressed && !busy && styles.pressed]}
      >
        {deleteStatus === 'submitting' ? (
          <ActivityIndicator accessibilityLabel="جارٍ حذف المنتج" color={color.error.DEFAULT} />
        ) : (
          <Text style={styles.destructiveText}>حذف المنتج</Text>
        )}
      </Pressable>

      <Modal
        visible={deleting}
        transparent
        animationType="fade"
        accessibilityLabel="تأكيد حذف المنتج"
        onRequestClose={() => setDeleting(false)}
      >
        <View style={styles.scrim}>
          <Card background={color.surface.base} padded style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.dialogTitle}>
              تأكيد حذف المنتج
            </Text>
            <Text style={styles.body}>سيتم حذف المنتج نهائيًا من كتالوج متجرك. لا يمكن التراجع.</Text>
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="تأكيد الحذف"
                onPress={() => {
                  setDeleting(false);
                  onDelete(productId);
                }}
                style={({ pressed }) => [styles.destructiveSolid, pressed && styles.pressed]}
              >
                <Text style={styles.destructiveSolidText}>حذف</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="إلغاء"
                onPress={() => setDeleting(false)}
                style={({ pressed }) => [styles.secondaryInline, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>إلغاء</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </Modal>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('merchant.product.backToCatalog')}
        onPress={onBackToList}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>{t('merchant.product.backToCatalog')}</Text>
      </Pressable>
    </View>
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
    gap: spacing[3],
  },
  heroMetaRow: { flexDirection: 'row', direction: 'rtl', alignItems: 'center' },
  section: { paddingHorizontal: spacing[5], paddingTop: spacing[4], gap: spacing[3] },
  detailTitle: { ...type.h2, color: color.text.primary, textAlign: 'right', writingDirection: 'rtl', padding: spacing[5] },
  successCard: { marginHorizontal: spacing[5], gap: spacing[2] },
  heroPrice: { ...type.h2, color: color.brand.gold, textAlign: 'right', writingDirection: 'rtl' },
  heroNoPrice: { ...type.body, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  showcase: { flexDirection: 'row', direction: 'rtl', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3], padding: spacing[3], backgroundColor: color.surface.base, borderRadius: radius.md, borderWidth: 1, borderColor: color.border.default },
  showcaseMeta: { alignItems: 'flex-end', gap: spacing[2] },
  stockLine: { ...type.caption, color: color.text.secondary, textAlign: 'right', writingDirection: 'rtl' },
  body: {
    ...type.body,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  secondary: {
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[4],
  },
  pressed: {
    opacity: 0.8,
  },
  secondaryText: {
    ...type.bodyMedium,
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
  disabled: {
    opacity: 0.6,
  },
  warn: {
    borderWidth: 1,
    borderColor: color.brand.gold,
    backgroundColor: color.brand.goldSoft,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
  },
  warnText: {
    ...type.button,
    color: color.brand.navy,
  },
  warnSolid: {
    flex: 1,
    backgroundColor: color.brand.gold,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnSolidText: {
    ...type.button,
    color: color.brand.navy,
  },
  destructive: {
    borderWidth: 1,
    borderColor: color.error.DEFAULT,
    backgroundColor: color.error.soft,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing[3],
  },
  destructiveText: {
    ...type.button,
    color: color.error.DEFAULT,
  },
  destructiveSolid: {
    flex: 1,
    backgroundColor: color.error.DEFAULT,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destructiveSolidText: {
    ...type.button,
    color: color.surface.base,
  },
  secondaryInline: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.border.default,
    backgroundColor: color.surface.base,
    borderRadius: radius.md,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
  statusTitle: {
    ...type.h3,
    color: color.text.primary,
    textAlign: 'right',
  },
  scrim: {
    flex: 1,
    backgroundColor: color.overlay.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    gap: spacing[2],
  },
  dialogTitle: {
    ...type.h3,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  dialogActions: {
    flexDirection: 'row',
    direction: 'rtl',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
