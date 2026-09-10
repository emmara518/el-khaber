/**
 * View-model hook for merchant onboarding.
 *
 * Owns the draft machine + verification submission (idle →
 * submitting → submitted | error). Optional initial draft lets
 * rejected/action_required merchants resume with saved data. The
 * submitted result is pending review — never approved.
 */

import { useCallback, useEffect, useReducer, useState } from 'react';

import { MockMerchantProfileDataSource } from '../profile/mock-merchant-profile-data-source';

import {
  INITIAL_MERCHANT_ONBOARDING_STATE,
  merchantOnboardingReducer,
  type MerchantOnboardingEvent,
} from './merchant-onboarding-machine';

import type {
  MerchantProfile,
  MerchantProfileDataSource,
  MerchantProfileDraft,
} from '../profile/merchant-profile-types';

export type MerchantSubmitStatus = 'idle' | 'submitting' | 'submitted' | 'error';

export interface MerchantOnboardingViewModel {
  machine: typeof INITIAL_MERCHANT_ONBOARDING_STATE;
  dispatch: (event: MerchantOnboardingEvent) => void;
  submitStatus: MerchantSubmitStatus;
  submitted: MerchantProfile | null;
  submitError: string | null;
  submit: () => void;
  retrySubmit: () => void;
}

export function useMerchantOnboardingViewModel(
  initialDraft?: MerchantProfileDraft,
  source: MerchantProfileDataSource = new MockMerchantProfileDataSource(),
): MerchantOnboardingViewModel {
  const [machine, dispatch] = useReducer(merchantOnboardingReducer, INITIAL_MERCHANT_ONBOARDING_STATE);
  const [submitStatus, setSubmitStatus] = useState<MerchantSubmitStatus>('idle');
  const [submitted, setSubmitted] = useState<MerchantProfile | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDraft === undefined) return;
    dispatch({ type: 'SET_TEXT', field: 'businessNameAr', text: initialDraft.businessNameAr });
    dispatch({ type: 'SET_TEXT', field: 'phoneAr', text: initialDraft.phoneAr });
    dispatch({ type: 'SET_TEXT', field: 'bioAr', text: initialDraft.bioAr });
    dispatch({ type: 'SET_TEXT', field: 'cityAr', text: initialDraft.cityAr });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(() => {
    if (submitStatus === 'submitting' || submitStatus === 'submitted') return;
    setSubmitStatus('submitting');
    setSubmitError(null);
    void (async () => {
      try {
        const result = await source.submitVerificationProfile({
          role: 'merchant',
          profile: machine.draft,
        });
        setSubmitted(result);
        setSubmitStatus('submitted');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'فشل إرسال بيانات المتجر');
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
