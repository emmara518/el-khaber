/**
 * Route entry: Add Product (M-D) — create mode with shared session
 * source so created products appear in catalog/detail immediately.
 */

import { useLocalSearchParams } from 'expo-router';

import { sharedMerchantProductsSource } from '../../../src/features/merchant/products/api-merchant-products-data-source';
import MerchantProductFormScreen from '../../../src/features/merchant/products/merchant-product-form-screen';

export default function NewProductRoute() {
  const params = useLocalSearchParams<{ deferred?: string }>();
  void params;
  return <MerchantProductFormScreen mode="create" source={sharedMerchantProductsSource} />;
}
