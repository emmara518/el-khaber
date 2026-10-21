import MerchantCatalogScreen from '../../src/features/merchant/products/merchant-catalog-screen';

/**
 * Route entry: Merchant Catalog (M-C) — display-only product list
 * behind `useMerchantProductsViewModel` backed by the real API adapter
 * (GET /merchant/products).
 */
export default function MerchantProductsRoute() {
  return <MerchantCatalogScreen />;
}
