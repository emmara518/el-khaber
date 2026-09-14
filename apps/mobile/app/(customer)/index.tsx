import CustomerHomeScreen from '../../src/features/customer/home/customer-home-screen';

/**
 * Route entry: Customer Home. The screen body lives in
 * `src/features/customer/home/customer-home-screen.tsx` and is
 * driven by the `useCustomerHomeViewModel` hook backed by the real API
 * adapter (`ApiCustomerHomeDataSource`).
 */
export default function HomeRoute() {
  return <CustomerHomeScreen />;
}
