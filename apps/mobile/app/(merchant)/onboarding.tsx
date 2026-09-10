/**
 * Route entry: Merchant Onboarding (M-B).
 * Stepped flow (identity → business → contact → review → submit →
 * pending). Rejected/action_required merchants arrive via the
 * profile update-data entry and continue with saved data.
 */

import MerchantOnboardingScreen from '../../src/features/merchant/onboarding/merchant-onboarding-screen';

export default function MerchantOnboardingRoute() {
  return <MerchantOnboardingScreen />;
}
