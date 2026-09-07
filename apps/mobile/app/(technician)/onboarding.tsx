/**
 * Route entry: Technician Onboarding (T-B).
 * Stepped flow (info → specialty → appliances → services → areas →
 * review → submit → pending). Rejected/action_required techs arrive
 * with `?resume=1` and continue from their saved draft.
 */

import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import TechnicianOnboardingScreen from '../../src/features/technician/onboarding/technician-onboarding-screen';
import { MockTechnicianProfileDataSource } from '../../src/features/technician/profile/mock-technician-profile-data-source';
import {
  draftFromProfile,
  type TechnicianProfileDraft,
} from '../../src/features/technician/profile/technician-profile-types';

export default function TechnicianOnboardingRoute() {
  const params = useLocalSearchParams<{ resume?: string }>();
  const [initialDraft, setInitialDraft] = useState<TechnicianProfileDraft | undefined>(undefined);
  const [ready, setReady] = useState(params.resume !== '1');

  useEffect(() => {
    if (params.resume !== '1') return;
    let cancelled = false;
    new MockTechnicianProfileDataSource()
      .getProfile({ role: 'technician' })
      .then((profile) => {
        if (cancelled) return;
        setInitialDraft(draftFromProfile(profile));
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
  return <TechnicianOnboardingScreen initialDraft={initialDraft} />;
}
