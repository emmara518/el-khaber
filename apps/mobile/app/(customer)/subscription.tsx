import SubscriptionScreen from '../../src/features/subscriptions/subscription-screen';

/**
 * Route entry: Customer subscription. Renders the shared role-parameterized
 * subscription experience (same component the merchant shell uses).
 */
export default function CustomerSubscriptionRoute() {
  return <SubscriptionScreen role="customer" />;
}
