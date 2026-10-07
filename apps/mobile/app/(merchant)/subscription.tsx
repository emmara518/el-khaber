import SubscriptionScreen from '../../src/features/subscriptions/subscription-screen';

/**
 * Route entry: Merchant subscription. Reuses the shared subscription
 * experience driven by the role-scoped merchant endpoints
 * (`/merchant/subscription/current`, `/merchant/subscription/payment`).
 */
export default function MerchantSubscriptionRoute() {
  return <SubscriptionScreen role="merchant" />;
}
