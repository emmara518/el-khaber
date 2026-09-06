import CustomerRequestsScreen from '../../src/features/customer/requests/customer-requests-screen';

/**
 * Route entry: Customer Requests. Presentation lives in the feature
 * folder behind the `useCustomerRequestsViewModel` hook (mock data
 * source today, real API adapter later without touching this file).
 */
export default function RequestsRoute() {
  return <CustomerRequestsScreen />;
}
