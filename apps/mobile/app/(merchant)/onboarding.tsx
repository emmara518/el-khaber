/**
 * Route entry: Merchant Onboarding (M-B).
 * Stepped flow (identity → business → contact → review → submit →
 * pending). Rejected/action_required merchants arrive via the
 * update-data entry with `?resume=1` and continue with saved data.
 */

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import MerchantOnboardingScreen from '../../src/features/merchant/onboarding/merchant-onboarding-screen';
import { ApiMerchantProfileDataSource } from '../../src/features/merchant/profile/api-merchant-profile-data-source';
import {
  draftFromMerchantProfile,
  type MerchantProfileDraft,
} from '../../src/features/merchant/profile/merchant-profile-types';

export default function MerchantOnboardingRoute() {
  const params = useLocalSearchParams<{ resume?: string }>();
  const [initialDraft, setInitialDraft] = useState<MerchantProfileDraft | undefined>(undefined);
  const [ready, setReady] = useState(params.resume !== '1');

  useEffect(() => {
    if (params.resume !== '1') return;
    let cancelled = false;
    new ApiMerchantProfileDataSource()
      .getProfile({ role: 'merchant' })
      .then((profile) => {
        if (cancelled) return;
        setInitialDraft(draftFromMerchantProfile(profile));
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [params.resume]);

  if (!ready) return null;
  return <MerchantOnboardingScreen initialDraft={initialDraft} />;
}
