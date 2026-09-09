import MerchantHomeScreen from '../../src/features/merchant/home/merchant-home-screen';

/**
 * Route entry: Merchant Home (M-A). Presentation lives in the
 * feature folder behind `useMerchantHomeViewModel` (mock data
 * source today, real API adapter later without touching this file).
 * Products/messages/profile tabs remain explicit placeholders until
 * their assigned batches.
 */
export default function MerchantHomeRoute() {
  return <MerchantHomeScreen />;
}
