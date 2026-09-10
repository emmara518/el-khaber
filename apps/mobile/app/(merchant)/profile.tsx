import MerchantProfileScreen from '../../src/features/merchant/profile/merchant-profile-screen';

/**
 * Route entry: Merchant Profile (M-B) — PUBLIC store-facing profile.
 * Verification state shows as a badge + status card with guidance;
 * rejected/action_required get an update-data entry into onboarding.
 * Account settings remain a separate route.
 */
export default function MerchantProfileRoute() {
  return <MerchantProfileScreen />;
}
