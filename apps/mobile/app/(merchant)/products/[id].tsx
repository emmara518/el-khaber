import { useLocalSearchParams } from 'expo-router';

import { sharedMerchantProductsSource } from '../../../src/features/merchant/products/api-merchant-products-data-source';
import MerchantProductDetailScreen from '../../../src/features/merchant/products/merchant-product-detail-screen';

/**
 * Route entry: Merchant Product Details (M-C + M-D).
 * Typed product id; the screen owns a single data source + view-model
 * (no duplicate fetch at the route level).
 */
export default function MerchantProductDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = typeof params.id === 'string' ? params.id : '';

  return (
    <MerchantProductDetailScreen
      productId={productId}
      source={sharedMerchantProductsSource}
    />
  );
}
