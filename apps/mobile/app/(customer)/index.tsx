import CustomerHomeScreen from '../../src/features/customer/home/customer-home-screen';

/**
 * Route entry: Customer Home. The screen body lives in
 * `src/features/customer/home/customer-home-screen.tsx` and is
 * driven by the `useCustomerHomeViewModel` hook which currently
 * sources its data from `MockCustomerHomeDataSource`. The hook
 * contract and the data-source interface are designed so the
 * implementation can be swapped for a real API adapter without
 * changing this file or the screen component.
 */
export default function HomeRoute() {
  return <CustomerHomeScreen />;
}
