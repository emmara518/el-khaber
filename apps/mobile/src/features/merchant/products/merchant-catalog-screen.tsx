/**
 * Merchant Catalog screen (M-C) — display-only product list.
 *
 * Search (simple text match) + category/status chips + product
 * cards (image placeholder, name, category, description, status,
 * optional price) → detail. Empty/error/loading states; "إضافة
 * منتج" CTA opens the product form screen.
 */

import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ListEmpty, ListError, ListLoading } from '../../customer/components/list-state-view';

import {
  EMPTY_PRODUCT_FILTERS,
  MERCHANT_PRODUCT_CATEGORIES,
  PRODUCT_STATUS_OPTIONS,
  filterMerchantProducts,
  type MerchantProduct,
} from './merchant-product-types';
import { ProductImagePlaceholder } from './product-image-placeholder';
import { useMerchantProductsViewModel } from './use-merchant-products-view-model';

import type { MerchantProductFilters } from './merchant-product-types';
import type { MerchantProductsDataSource } from './mock-merchant-products-data-source';

import { useI18n } from '@/i18n/use-i18n';
import { Card, StatusBadge } from '@/ui';


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
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        {t('merchant.catalog.title')}
      </Text>
      <Text style={styles.subtitle}>{t('merchant.catalog.subtitle')}</Text>

      {status === 'loading' ? <ListLoading label={t('state.loading')} /> : null}
      {status === 'error' ? (
        <ListError
          title={t('merchant.catalog.error')}
          message={error?.message ?? ''}
          retryLabel={t('state.retry')}
          onRetry={retry}
        />
      ) : null}
      {status === 'loaded' && data ? (
        <>
          <TextInput
            accessibilityLabel="ابحث في منتجات المتجر"
            placeholder="ابحث بالاسم أو الوصف…"
            placeholderTextColor={color.text.secondary}
            value={filters.query}
            onChangeText={(query) => setFilters((f) => ({ ...f, query }))}
            style={styles.search}
            textAlign="right"
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[null, ...MERCHANT_PRODUCT_CATEGORIES].map((category) => {
              const label = category ?? 'الأقسام';
              const selected = filters.category === category;
              return (
                <Pressable
                  key={label}
                  accessibilityRole="tab"
                  accessibilityLabel={`تصفية حسب القسم: ${label}${selected ? '، محدد حاليًا' : ''}`}
                  accessibilityState={{ selected }}
                  onPress={() => setFilters((f) => ({ ...f, category }))}
                  style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

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
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {selected ? '✓ ' : ''}{option.labelAr}
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
    </ScrollView>
  );

  function renderList(
    products: ReadonlyArray<MerchantProduct>,
    translate: (key: 'merchant.catalog.empty' | 'merchant.catalog.emptyBody' | 'merchant.catalog.add') => string,
  ) {
    if (products.length === 0) {
      return (
        <ListEmpty
          icon="📦"
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
            accessibilityLabel={`عرض تفاصيل ${product.nameAr}، القسم: ${product.categoryAr}، الحالة: ${product.statusLabelAr}${
              product.priceSar !== null ? `، السعر: ${product.priceSar} ريال` : ''
            }`}
            onPress={() => router.push({ pathname: '/(merchant)/products/[id]', params: { id: product.id } })}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Card background={color.surface.base} padded style={styles.card}>
              <View style={styles.row}>
                <ProductImagePlaceholder nameAr={product.nameAr} hasImage={product.hasImage} />
                <View style={styles.middle}>
                  <Text style={styles.name} numberOfLines={2}>
                    {product.nameAr}
                  </Text>
                  <Text style={styles.category}>{product.categoryAr}</Text>
                  <Text style={styles.description} numberOfLines={2}>
                    {product.descriptionAr}
                  </Text>
                  {product.priceSar !== null ? (
                    <Text style={styles.price}>{product.priceSar} ريال</Text>
                  ) : (
                    <Text style={styles.noPrice}>{t('merchant.catalog.noPrice')}</Text>
                  )}
                </View>
                <View style={styles.side}>
                  <StatusBadge status={product.status} label={product.statusLabelAr} />
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    );
  }
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
  },
  subtitle: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  search: {
    borderWidth: 1,
    borderColor: color.border.default,
    borderRadius: radius.md,
    backgroundColor: color.surface.base,
    color: color.text.primary,
    fontSize: typography.size.body,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 52,
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
  pressed: {
    opacity: 0.75,
  },
  chipText: {
    color: color.text.secondary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  chipTextSelected: {
    color: color.text.primary,
    fontWeight: typography.weight.bold,
  },
  count: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginVertical: spacing[3],
    textAlign: 'right',
  },
  list: {
    gap: spacing[3],
  },
  card: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  middle: {
    flex: 1,
  },
  name: {
    color: color.text.primary,
    fontSize: typography.size.body,
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
  description: {
    color: color.text.secondary,
    fontSize: typography.size.caption,
    marginTop: spacing[1],
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  price: {
    color: color.text.primary,
    fontSize: typography.size.body,
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
  side: {
    alignItems: 'flex-end',
  },
  bottomSpacer: {
    height: spacing[6],
  },
});
