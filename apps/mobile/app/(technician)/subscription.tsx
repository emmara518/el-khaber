import SubscriptionScreen from '../../src/features/subscriptions/subscription-screen';

/**
 * Route entry: Technician subscription. Renders the shared role-parameterized
 * subscription experience (the same component the customer and merchant
 * shells use). Manual payment proof + renewal cancel are handled inside.
 */
export default function TechnicianSubscriptionRoute() {
  return <SubscriptionScreen role="technician" />;
}
