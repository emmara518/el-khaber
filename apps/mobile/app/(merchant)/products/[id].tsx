import { useLocalSearchParams } from 'expo-router';

import MerchantProductDetailScreen from '../../../src/features/merchant/products/merchant-product-detail-screen';

/**
 * Route entry: Merchant Product Details (M-C).
 * Typed product id; unknown ids render a safe missing state with
 * an exit to the catalog. No mutation controls (M-D owns those).
 */
export default function MerchantProductDetailRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = typeof params.id === 'string' ? params.id : '';
  return <MerchantProductDetailScreen productId={productId} />;
}
