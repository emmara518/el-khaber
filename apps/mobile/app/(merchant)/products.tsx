import MerchantCatalogScreen from '../../src/features/merchant/products/merchant-catalog-screen';

/**
 * Route entry: Merchant Catalog (M-C) — display-only product list
 * behind `useMerchantProductsViewModel` (mock today, real API
 * adapter for GET /merchant/products later).
 */
export default function MerchantProductsRoute() {
  return <MerchantCatalogScreen />;
}
