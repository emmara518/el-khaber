import { useLocalSearchParams } from 'expo-router';

import MerchantProductFormScreen from '../../../../src/features/merchant/products/merchant-product-form-screen';
import {
  draftFromProduct,
  findMerchantProduct,
} from '../../../../src/features/merchant/products/merchant-product-types';
import { sharedMerchantProductsSource } from '../../../../src/features/merchant/products/mock-merchant-products-data-source';
import { useMerchantProductsViewModel } from '../../../../src/features/merchant/products/use-merchant-products-view-model';

/**
 * Route entry: Edit Product (M-D) — edit mode prefilled from the
 * shared session source by typed product id; the id is preserved.
 */
export default function EditProductRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = typeof params.id === 'string' ? params.id : '';
  const { status, data } = useMerchantProductsViewModel(sharedMerchantProductsSource);
  const product = status === 'loaded' ? findMerchantProduct(data ?? [], productId) : null;

  if (status === 'loading') return null;
  if (product === null) {
    return (
      <MerchantProductFormScreen
        mode="edit"
        productId={productId}
        source={sharedMerchantProductsSource}
      />
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
