/**
 * View-model hook for technician onboarding (WP-3).
 *
 * Owns the draft machine + canonical service selection + submission
 * (idle → submitting → submitted | error). Loads the canonical service
 * catalog (for the services step) and the technician's already-attached
 * services (so a rejected/action_required technician resumes with their
 * real coverage). The submitted result is pending review — never approved.
 */

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';

import { ApiTechnicianProfileDataSource } from '../profile/api-technician-profile-data-source';
import { ApiTechnicianServicesDataSource } from '../services/api-technician-services-data-source';

import {
  INITIAL_ONBOARDING_STATE,
  onboardingReducer,
  type OnboardingEvent,
} from './technician-onboarding-machine';

import type { TechnicianProfile, TechnicianProfileDataSource, TechnicianProfileDraft } from '../profile/technician-profile-types';
import type {
  TechnicianServiceCatalogItem,
  TechnicianServicesDataSource,
} from '../services/technician-services-types';

export type OnboardingSubmitStatus = 'idle' | 'submitting' | 'submitted' | 'error';
export type OnboardingCatalogStatus = 'loading' | 'loaded' | 'error';

export interface TechnicianOnboardingViewModel {
  machine: typeof INITIAL_ONBOARDING_STATE;
  dispatch: (event: OnboardingEvent) => void;
  catalog: ReadonlyArray<TechnicianServiceCatalogItem>;
  catalogStatus: OnboardingCatalogStatus;
  submitStatus: OnboardingSubmitStatus;
  submitted: TechnicianProfile | null;
  submitError: string | null;
  submit: () => void;
  retrySubmit: () => void;
}

export function useTechnicianOnboardingViewModel(
  initialDraft?: TechnicianProfileDraft,
  source?: TechnicianProfileDataSource,
  servicesSource?: TechnicianServicesDataSource,
): TechnicianOnboardingViewModel {
  const profileSource = useMemo<TechnicianProfileDataSource>(
    () => source ?? new ApiTechnicianProfileDataSource(),
    [source],
  );
  const catalogSource = useMemo<TechnicianServicesDataSource>(
    () => servicesSource ?? new ApiTechnicianServicesDataSource(),
    [servicesSource],
  );

  const [machine, dispatch] = useReducer(onboardingReducer, INITIAL_ONBOARDING_STATE);
  const [catalog, setCatalog] = useState<ReadonlyArray<TechnicianServiceCatalogItem>>([]);
  const [catalogStatus, setCatalogStatus] = useState<OnboardingCatalogStatus>('loading');
  const [submitStatus, setSubmitStatus] = useState<OnboardingSubmitStatus>('idle');
  const [submitted, setSubmitted] = useState<TechnicianProfile | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Prefill from the resuming draft + existing canonical service coverage.
  useEffect(() => {
    if (initialDraft !== undefined) {
      dispatch({ type: 'SET_TEXT', field: 'displayNameAr', text: initialDraft.displayNameAr });
      dispatch({ type: 'SET_TEXT', field: 'phoneAr', text: initialDraft.phoneAr });
      dispatch({ type: 'SET_TEXT', field: 'bioAr', text: initialDraft.bioAr });
      dispatch({ type: 'SET_EXPERIENCE', years: initialDraft.experienceYears });
      for (const value of initialDraft.areasAr) dispatch({ type: 'TOGGLE_AREA', value });
    }
    let active = true;
    void (async () => {
      setCatalogStatus('loading');
      try {
        const [items, attached] = await Promise.all([
          catalogSource.getCatalog({ role: 'technician' }),
          catalogSource.getAttached({ role: 'technician' }).catch(() => []),
        ]);
        if (!active) return;
        setCatalog(items);
        setCatalogStatus('loaded');
        for (const service of attached) {
          dispatch({ type: 'TOGGLE_SERVICE', value: service.serviceId });
        }
      } catch {
        if (!active) return;
        setCatalog([]);
        setCatalogStatus('error');
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogSource]);

  const submit = useCallback(() => {
    if (submitStatus === 'submitting' || submitStatus === 'submitted') return;
    setSubmitStatus('submitting');
    setSubmitError(null);
    void (async () => {
      try {
        const result = await profileSource.submitVerificationProfile({
          role: 'technician',
          profile: machine.draft,
          serviceIds: machine.serviceIds,
        });
        setSubmitted(result);
        setSubmitStatus('submitted');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'فشل إرسال البيانات');
        setSubmitStatus('error');
      }
    })();
  }, [profileSource, submitStatus, machine.draft, machine.serviceIds]);

  const retrySubmit = useCallback(() => {
    setSubmitStatus('idle');
    setSubmitError(null);
  }, []);

  return { machine, dispatch, catalog, catalogStatus, submitStatus, submitted, submitError, submit, retrySubmit };
}
