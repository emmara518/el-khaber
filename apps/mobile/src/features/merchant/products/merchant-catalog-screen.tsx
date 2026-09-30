/**
 * Merchant Catalog screen (M-C) — display-only product list.
 *
 * Search (simple text match) + category/status chips + product
 * cards (image placeholder, name, category, description, status,
 * optional price) → detail. Empty/error/loading states; "إضافة
 * منتج" CTA opens the product form screen.
 */

import { color, radius, spacing } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  EMPTY_PRODUCT_FILTERS,
  PRODUCT_STATUS_OPTIONS,
  filterMerchantProducts,
  type MerchantProduct,
} from './merchant-product-types';
import { ProductImagePlaceholder } from './product-image-placeholder';
import { useMerchantProductsViewModel } from './use-merchant-products-view-model';

import type { MerchantProductFilters } from './merchant-product-types';
import type { MerchantProductsDataSource } from './mock-merchant-products-data-source';

import { useI18n } from '@/i18n/use-i18n';
import { ActionButton, AppHeader, Icon, ListEmpty, ListError, ListLoading, PageTitle, SearchField, StatusBadge, type } from '@/ui';


export default function MerchantCatalogScreen({
  source,
}: {
  source?: MerchantProductsDataSource;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { status, data, error, retry } = useMerchantProductsViewModel(source);
  const [filters, setFilters] = useState<MerchantProductFilters>(EMPTY_PRODUCT_FILTERS);

  return (
    <View style={styles.root}>
      <AppHeader
        onPressNotifications={() => router.push('/(merchant)/notifications')}
        onPressAvatar={() => router.push('/(merchant)/profile')}
      />
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <PageTitle
          eyebrow="المتجر · الكتالوج"
          title={t('merchant.catalog.title')}
          body={t('merchant.catalog.subtitle')}
        />
        <ActionButton
          label={t('merchant.catalog.add')}
          icon="plus-circle"
          onPress={() => router.push('/(merchant)/products/new')}
        />
      </View>

      <View style={styles.editorial}>
      {status === 'loading' ? <ListLoading label={t('state.loading')} asset="merchant_products" /> : null}
      {status === 'error' ? (
        <ListError
          asset="fault_empty"
          title={t('merchant.catalog.error')}
          message={error?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={retry}
        />
      ) : null}
      {status === 'loaded' && data ? (
        <>
          <SearchField
            accessibilityLabel="ابحث في منتجات المتجر"
            placeholder="ابحث بالاسم أو الوصف…"
            value={filters.query}
            onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
            style={styles.searchField}
          />

          <View style={styles.statusRow}>
            {PRODUCT_STATUS_OPTIONS.map((option) => {
              const selected = filters.status === option.value;
              return (
                <Pressable
                  key={option.labelAr}
                  accessibilityRole="radio"
                  accessibilityLabel={`حالة المنتج: ${option.labelAr}${selected ? '، محدد حاليًا' : ''}`}
                  accessibilityState={{ selected, checked: selected }}
                  onPress={() => setFilters((f) => ({ ...f, status: option.value }))}
                  style={({ pressed }) => [
                    styles.statusChip,
                    selected && styles.chipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  {selected ? <Icon name="check" size={14} color={color.brand.navy} /> : null}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {option.labelAr}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.count}>عدد المنتجات: {filterMerchantProducts(data, filters).length}</Text>

          {renderList(filterMerchantProducts(data, filters), t)}
        </>
      ) : null}
        <View style={styles.bottomSpacer} />
      </View>
      </ScrollView>
    </View>
  );

  function renderList(
    products: ReadonlyArray<MerchantProduct>,
    translate: (key: 'merchant.catalog.empty' | 'merchant.catalog.emptyBody' | 'merchant.catalog.add') => string,
  ) {
    if (products.length === 0) {
      return (
        <ListEmpty
          asset="merchant_products"
          icon="package"
          iconLabel="لا توجد منتجات"
          title={translate('merchant.catalog.empty')}
          body={translate('merchant.catalog.emptyBody')}
          actionLabel={translate('merchant.catalog.add')}
          onAction={() =>
            router.push({ pathname: '/(merchant)/products/new', params: { deferred: '1' } })
          }
        />
      );
    }
    return (
      <View style={styles.list}>
        {products.map((product) => (
          <Pressable
            key={product.id}
            accessibilityRole="button"
            accessibilityLabel={`عرض تفاصيل ${product.nameAr}، الحالة: ${product.statusLabelAr}${
              product.price !== null ? `، السعر: ${product.price} جنيه` : ''
            }${product.stockQuantity !== null ? `، المخزون: ${product.stockQuantity}` : ''}`}
            onPress={() => router.push({ pathname: '/(merchant)/products/[id]', params: { id: product.id } })}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <View style={styles.card}>
              <View style={styles.row}>
                <ProductImagePlaceholder nameAr={product.nameAr} hasImage={product.hasImage} />
                <View style={styles.middle}>
                  <Text style={styles.name} numberOfLines={2}>
                    {product.nameAr}
                  </Text>
                  <Text style={styles.description} numberOfLines={2}>
                    {product.descriptionAr}
                  </Text>
                  {product.price !== null ? (
                    <Text style={styles.price}>{product.price} جنيه</Text>
                  ) : (
                    <Text style={styles.noPrice}>{t('merchant.catalog.noPrice')}</Text>
                  )}
                  {product.stockQuantity !== null ? (
                    <Text style={styles.stock}>
                      {t('merchant.catalog.stock')}: {product.stockQuantity}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.side}>
                  <StatusBadge status={product.status} label={product.statusLabelAr} />
                </View>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: color.surface.subtle,
    direction: 'rtl',
  },
  content: {
    direction: 'rtl',
    paddingBottom: spacing[8],
  },
  header: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    gap: spacing[3],
  },
  editorial: {
    paddingHorizontal: spacing[5],
    paddingTop: spacing[2],
  },
  searchField: {
    marginTop: spacing[4],
  },
  chips: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  statusChip: {
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
    borderColor: color.brand.navy,
    borderWidth: 2,
    backgroundColor: color.surface.base,
  },
  pressed: {
    opacity: 0.75,
  },
  chipText: {
    ...type.bodyMedium,
    color: color.text.secondary,
  },
  chipTextSelected: {
    color: color.text.primary,
  },
  count: {
    ...type.caption,
    color: color.text.secondary,
    marginVertical: spacing[3],
    textAlign: 'right',
  },
  list: {
    gap: spacing[3],
  },
  card: {
    gap: 0,
    backgroundColor: color.surface.base,
    padding: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border.default,
  },
  row: {
    flexDirection: 'row',
    direction: 'rtl',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  middle: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...type.cardTitle,
    color: color.text.primary,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  category: {
    ...type.caption,
    color: color.brand.navy,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  description: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  price: {
    ...type.number,
    fontSize: 16,
    lineHeight: 24,
    color: color.text.primary,
    marginTop: spacing[2],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  noPrice: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[2],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  stock: {
    ...type.caption,
    color: color.text.secondary,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  side: {
    alignItems: 'flex-end',
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
