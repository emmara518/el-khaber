/**
 * Merchant Product Details screen (M-C) — display-only.
 * Typed product id; shows documented fields only (name, category,
 * description, status, optional price, image placeholder). No edit
 * controls — M-D owns mutations.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListEmpty, ListError, ListLoading } from '../../customer/components/list-state-view';

import { findMerchantProduct } from './merchant-product-types';
import { ProductImagePlaceholder } from './product-image-placeholder';
import { useMerchantProductsViewModel } from './use-merchant-products-view-model';

import type { MerchantProductsDataSource } from './mock-merchant-products-data-source';

import { useI18n } from '@/i18n/use-i18n';
import { Card, StatusBadge } from '@/ui';


export default function MerchantProductDetailScreen({
  productId,
  source,
}: {
  productId: string;
  source?: MerchantProductsDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useMerchantProductsViewModel(source);

  if (status === 'loading') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('merchant.product.title')}
        </Text>
        <ListLoading label={t('state.loading')} />
      </ScrollView>
    );
  }

  if (status === 'error') {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
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
          icon="📦"
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
      <View style={styles.heading}>
        <View style={styles.headingText}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('merchant.product.title')}
          </Text>
          <Text style={styles.ref}>
            {t('merchant.product.ref')}: {product.id}
          </Text>
        </View>
        <StatusBadge status={product.status} label={product.statusLabelAr} />
      </View>

      <Card background={color.surface.base} padded style={styles.card}>
        <View style={styles.imageRow}>
          <ProductImagePlaceholder nameAr={product.nameAr} size={96} hasImage={product.hasImage} />
          <View style={styles.imageText}>
            <Text style={styles.name}>{product.nameAr}</Text>
            <Text style={styles.category}>{product.categoryAr}</Text>
            {product.priceSar !== null ? (
              <Text style={styles.price}>{product.priceSar} ريال</Text>
            ) : (
              <Text style={styles.noPrice}>{t('merchant.catalog.noPrice')}</Text>
            )}
          </View>
        </View>
      </Card>

      <Card background={color.surface.base} padded style={styles.card}>
        <Text style={styles.sectionLabel}>{t('merchant.product.description')}</Text>
        <Text style={styles.body}>{product.descriptionAr}</Text>
      </Card>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('merchant.product.backToCatalog')}
        onPress={() => router.replace('/(merchant)/products')}
        style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>{t('merchant.product.backToCatalog')}</Text>
      </Pressable>
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
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  headingText: {
    flex: 1,
  },
  title: {
    color: color.text.primary,
    fontSize: typography.size.h2,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ref: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  card: {
    marginTop: spacing[3],
    gap: spacing[2],
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  imageText: {
    flex: 1,
  },
  name: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  category: {
    color: color.brand.navy,
    fontSize: typography.size.caption,
    fontWeight: typography.weight.semibold,
    marginTop: spacing[1],
    textAlign: 'right',
  },
  price: {
    color: color.text.primary,
    fontSize: typography.size.h3,
    fontWeight: typography.weight.bold,
    marginTop: spacing[2],
    textAlign: 'right',
  },
  noPrice: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[2],
    textAlign: 'right',
  },
  sectionLabel: {
    color: color.brand.navy,
    fontSize: typography.size.body,
    fontWeight: typography.weight.bold,
    textAlign: 'right',
  },
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
  bottomSpacer: {
    height: spacing[6],
  },
});
