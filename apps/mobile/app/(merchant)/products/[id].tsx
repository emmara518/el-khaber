import { useLocalSearchParams } from 'expo-router';

import { sharedMerchantProductsSource } from '../../../src/features/merchant/products/api-merchant-products-data-source';
import MerchantProductDetailScreen from '../../../src/features/merchant/products/merchant-product-detail-screen';
import {
  findMerchantProduct,
} from '../../../src/features/merchant/products/merchant-product-types';
import { useMerchantProductsViewModel } from '../../../src/features/merchant/products/use-merchant-products-view-model';

/**
 * Route entry: Merchant Product Details (M-C + M-D).
 * Typed product id; shows documented fields; M-D adds the edit CTA
 * and the activate/suspend control with confirmation.
 */
export default function MerchantProductDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = typeof params.id === 'string' ? params.id : '';
  const { status, data } = useMerchantProductsViewModel(sharedMerchantProductsSource);
  const product = status === 'loaded' ? findMerchantProduct(data ?? [], productId) : null;

  return (
    <MerchantProductDetailScreen
      productId={productId}
      source={sharedMerchantProductsSource}
      editEnabled={status === 'loaded' && product !== null}
      shared
    />
  );
}
