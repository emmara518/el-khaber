/**
 * View-model hook for technician onboarding.
 *
 * Owns the draft machine + verification submission (idle →
 * submitting → submitted | error). Accepts a data-source override
 * and an optional initial draft (rejected/action_required techs
 * resume with their saved data). The submitted result is pending
 * review — never approved.
 */

import { useCallback, useEffect, useReducer, useState } from 'react';

import { MockTechnicianProfileDataSource } from '../profile/mock-technician-profile-data-source';

import {
  INITIAL_ONBOARDING_STATE,
  onboardingReducer,
  type OnboardingEvent,
} from './technician-onboarding-machine';

import type {
  TechnicianProfile,
  TechnicianProfileDataSource,
  TechnicianProfileDraft,
} from '../profile/technician-profile-types';

export type OnboardingSubmitStatus = 'idle' | 'submitting' | 'submitted' | 'error';

export interface TechnicianOnboardingViewModel {
  machine: typeof INITIAL_ONBOARDING_STATE;
  dispatch: (event: OnboardingEvent) => void;
  submitStatus: OnboardingSubmitStatus;
  submitted: TechnicianProfile | null;
  submitError: string | null;
  submit: () => void;
  retrySubmit: () => void;
}

export function useTechnicianOnboardingViewModel(
  initialDraft?: TechnicianProfileDraft,
  source: TechnicianProfileDataSource = new MockTechnicianProfileDataSource(),
): TechnicianOnboardingViewModel {
  const [machine, dispatch] = useReducer(onboardingReducer, INITIAL_ONBOARDING_STATE);
  const [submitStatus, setSubmitStatus] = useState<OnboardingSubmitStatus>('idle');
  const [submitted, setSubmitted] = useState<TechnicianProfile | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDraft === undefined) return;
    dispatch({ type: 'SET_TEXT', field: 'displayNameAr', text: initialDraft.displayNameAr });
    dispatch({ type: 'SET_TEXT', field: 'phoneAr', text: initialDraft.phoneAr });
    dispatch({ type: 'SET_TEXT', field: 'bioAr', text: initialDraft.bioAr });
    dispatch({ type: 'SET_EXPERIENCE', years: initialDraft.experienceYears });
    for (const value of initialDraft.specialtiesAr) dispatch({ type: 'TOGGLE_SPECIALTY', value });
    for (const value of initialDraft.appliances) dispatch({ type: 'TOGGLE_APPLIANCE', value });
    for (const value of initialDraft.servicesAr) dispatch({ type: 'TOGGLE_SERVICE', value });
    for (const value of initialDraft.areasAr) dispatch({ type: 'TOGGLE_AREA', value });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(() => {
    if (submitStatus === 'submitting' || submitStatus === 'submitted') return;
    setSubmitStatus('submitting');
    setSubmitError(null);
    void (async () => {
      try {
        const result = await source.submitVerificationProfile({
          role: 'technician',
          profile: machine.draft,
        });
        setSubmitted(result);
        setSubmitStatus('submitted');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'فشل إرسال البيانات');
        setSubmitStatus('error');
      }
    })();
    // The review-step draft is settled when submit fires.
  }, [source, submitStatus, machine.draft]);

  const retrySubmit = useCallback(() => {
    setSubmitStatus('idle');
    setSubmitError(null);
  }, []);

  return { machine, dispatch, submitStatus, submitted, submitError, submit, retrySubmit };
}
