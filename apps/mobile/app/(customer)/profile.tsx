import CustomerProfileScreen from '../../src/features/customer/profile/customer-profile-screen';

/**
 * Route entry: Customer Profile. Presentation lives in the feature
 * folder behind the `useCustomerProfileViewModel` hook. Logout uses
 * the existing auth store; subscription rows are entry-only in this
 * phase (full logic ships later).
 */
export default function ProfileRoute() {
  return <CustomerProfileScreen />;
}
