/**
 * Merchant Product Details screen (M-C + M-D).
 * Typed product id; shows documented fields only (name, category,
 * description, status, optional price, image placeholder). M-D adds
 * the تعديل المنتج CTA and the documented suspend/activate control
 * with confirmation — no delete (not in the docs).
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ListEmpty, ListError, ListLoading } from '../../customer/components/list-state-view';

import { findMerchantProduct } from './merchant-product-types';
import { ProductImagePlaceholder } from './product-image-placeholder';
import { useMerchantProductsViewModel } from './use-merchant-products-view-model';

import type { MerchantProductStatus } from './merchant-product-types';
import type { MerchantProductsDataSource } from './mock-merchant-products-data-source';

import { useI18n } from '@/i18n/use-i18n';
import { Card, StatusBadge } from '@/ui';
import { SceneAction, SceneHero, SceneSection } from '@/ui/cinematic';

export default function MerchantProductDetailScreen({
  productId,
  source,
  editEnabled = false,
  shared = false,
}: {
  productId: string;
  source?: MerchantProductsDataSource;
  editEnabled?: boolean;
  shared?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry, mutationStatus, mutationError, mutationResult, setProductStatus, resetMutation } =
    useMerchantProductsViewModel(source);
  void resetMutation;

  if (status === 'loading') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.detailTitle}>
          {t('merchant.product.title')}
        </Text>
        <ListLoading label={t('state.loading')} />
      </ScrollView>
    );
  }

  if (status === 'error') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.detailTitle}>
          {t('merchant.product.title')}
        </Text>
        <ListError
          title={t('merchant.catalog.error')}
          message={error?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={retry}
        />
      </ScrollView>
    );
  }

  const product = data !== null ? findMerchantProduct(data, productId) : null;
  if (!product) {
    return (
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
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SceneHero
        compact
        asset="merchant_success"
        eyebrow={`منتج ${product.id} · ${product.statusLabelAr}`}
        title={product.nameAr}
        body={product.categoryAr !== '' ? product.categoryAr : `${t('merchant.product.ref')}: ${product.id}`}
        action={editEnabled && shared ? (
          <SceneAction label={t('merchant.product.edit')} onPress={() => router.push({ pathname: '/(merchant)/products/[id]/edit', params: { id: product.id } })} />
        ) : undefined}
      >
        {product.priceSar !== null ? <Text style={styles.heroPrice}>{product.priceSar} ريال</Text> : null}
      </SceneHero>

      <SceneSection title={t('merchant.product.description')} body={product.descriptionAr}>
        <View style={styles.showcase}>
          <ProductImagePlaceholder nameAr={product.nameAr} hasImage={product.hasImage} />
          <StatusBadge status={product.status} label={product.statusLabelAr} />
        </View>
      </SceneSection>

      {editEnabled && shared ? (
        <ProductActions
          productId={product.id}
          status={product.status}
          mutationStatus={mutationStatus}
          mutationError={mutationError}
          mutationResult={mutationResult}
          setProductStatus={setProductStatus}
          onEdit={() =>
            router.push({ pathname: '/(merchant)/products/[id]/edit', params: { id: product.id } })
          }
          onBackToList={() => router.replace('/(merchant)/products')}
        />
      ) : null}

      {!(editEnabled && shared) ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('merchant.product.backToCatalog')}
          onPress={() => router.replace('/(merchant)/products')}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{t('merchant.product.backToCatalog')}</Text>
        </Pressable>
      ) : null}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function ProductActions({
  productId,
  status,
  mutationStatus,
  mutationError,
  mutationResult,
  setProductStatus,
  onEdit,
  onBackToList,
}: {
  productId: string;
  status: MerchantProductStatus;
  mutationStatus: 'idle' | 'submitting' | 'success' | 'error';
  mutationError: string | null;
  mutationResult: MerchantProductStatus extends never ? never : import('./merchant-product-types').MerchantProduct | null;
  setProductStatus: (productId: string, status: MerchantProductStatus) => void;
  onEdit: () => void;
  onBackToList: () => void;
}) {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const busy = mutationStatus === 'submitting';
  const nextStatus: MerchantProductStatus | null = status === 'active' ? 'suspended' : status === 'suspended' ? 'active' : null;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('merchant.product.edit')}
        onPress={onEdit}
        disabled={busy}
        style={({ pressed }) => [styles.primary, busy && styles.disabled, pressed && !busy && styles.pressed]}
      >
        <Text style={styles.primaryText}>{t('merchant.product.edit')}</Text>
      </Pressable>

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
  content: {
    direction: 'rtl',
    paddingBottom: spacing[8],
  },
  detailTitle: { color: color.text.primary, fontSize: typography.size.h2, fontWeight: typography.weight.bold, textAlign: 'right', writingDirection: 'rtl', padding: spacing[5] },
  successCard: { marginHorizontal: spacing[5], gap: spacing[2] },
  heroPrice: { color: color.brand.gold, fontSize: typography.size.h2, fontWeight: typography.weight.bold, lineHeight: 36, textAlign: 'right', writingDirection: 'rtl' },
  showcase: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3], padding: spacing[3], backgroundColor: color.surface.base, borderRadius: radius.md, borderWidth: 1, borderColor: color.border.default },
  body: {
    color: color.text.primary,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 26,
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
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
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
    color: color.brand.navy,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
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
    color: color.brand.navy,
    fontSize: typography.size.button,
    fontWeight: typography.weight.semibold,
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
    color: color.error.DEFAULT,
    fontSize: typography.size.body,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  statusTitle: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
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
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
