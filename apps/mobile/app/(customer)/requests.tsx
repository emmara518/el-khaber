import CustomerRequestsScreen from '../../src/features/customer/requests/customer-requests-screen';

/**
 * Route entry: Customer Requests. Presentation lives in the feature
 * folder behind the `useCustomerRequestsViewModel` hook backed by the
 * real API adapter.
 */
export default function RequestsRoute() {
  return <CustomerRequestsScreen />;
}
