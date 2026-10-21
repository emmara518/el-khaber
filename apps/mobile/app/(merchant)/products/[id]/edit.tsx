import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { sharedMerchantProductsSource } from '../../../../src/features/merchant/products/api-merchant-products-data-source';
import MerchantProductFormScreen from '../../../../src/features/merchant/products/merchant-product-form-screen';
import {
  draftFromProduct,
  findMerchantProduct,
} from '../../../../src/features/merchant/products/merchant-product-types';
import { useMerchantProductsViewModel } from '../../../../src/features/merchant/products/use-merchant-products-view-model';
import { useI18n } from '../../../../src/i18n/use-i18n';
import { AppHeader, ListEmpty, ListError } from '../../../../src/ui';

/**
 * Route entry: Edit Product (M-D) — edit mode prefilled from the
 * shared session source by typed product id; the id is preserved.
 *
 * A missing/unknown id is an honest "not found" state — never an
 * empty form that would PATCH a non-existent product.
 */
export default function EditProductRoute() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = typeof params.id === 'string' ? params.id : '';
  const { status, data, error, retry } = useMerchantProductsViewModel(sharedMerchantProductsSource);

  if (status === 'loading') {
    return (
      <View
        accessibilityRole="progressbar"
        style={styles.center}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (status === 'error') {
    return (
      <View style={styles.root}>
        <AppHeader />
        <View style={styles.body}>
          <ListError
            title={t('merchant.catalog.error')}
            message={error?.message ?? ''}
            retryLabel={t('state.retry')}
            onRetry={retry}
          />
        </View>
      </View>
    );
  }
  const product = findMerchantProduct(data ?? [], productId);
  if (product === null) {
    return (
      <View style={styles.root}>
        <AppHeader />
        <View style={styles.body}>
          <ListEmpty
            icon="package"
            iconLabel="منتج غير موجود"
            title={t('merchant.product.missing')}
            body={t('merchant.product.missingBody')}
            actionLabel={t('merchant.product.backToCatalog')}
            onAction={() => router.replace('/(merchant)/products')}
          />
        </View>
      </View>
    );
  }
  return (
    <MerchantProductFormScreen
      key={product.id}
      mode="edit"
      productId={product.id}
      initial={draftFromProduct(product)}
      source={sharedMerchantProductsSource}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
