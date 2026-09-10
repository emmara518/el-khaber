/**
 * Merchant onboarding machine — pure reducer (unit-tested).
 *
 * Steps: identity (name/city) → business info (bio) → contact
 * (phone) → review. One draft; Next validates the current step,
 * Back/Goto preserve everything. Submission lives in the hook.
 */

import {
  EMPTY_MERCHANT_DRAFT,
  validateMerchantDraft,
  type MerchantProfileDraft,
} from '../profile/merchant-profile-types';

export const MERCHANT_ONBOARDING_STEPS = [
  'identity',
  'business',
  'contact',
  'review',
] as const;

export type MerchantOnboardingStep = (typeof MERCHANT_ONBOARDING_STEPS)[number];

export interface MerchantOnboardingState {
  readonly step: MerchantOnboardingStep;
  readonly draft: MerchantProfileDraft;
  readonly stepError: string | null;
  readonly fieldErrors: Partial<Record<string, string>>;
}

export type MerchantOnboardingEvent =
  | { readonly type: 'SET_TEXT'; readonly field: 'businessNameAr' | 'phoneAr' | 'bioAr' | 'cityAr'; readonly text: string }
  | { readonly type: 'NEXT' }
  | { readonly type: 'BACK' }
  | { readonly type: 'GOTO'; readonly step: MerchantOnboardingStep };

export const INITIAL_MERCHANT_ONBOARDING_STATE: MerchantOnboardingState = {
  step: 'identity',
  draft: EMPTY_MERCHANT_DRAFT,
  stepError: null,
  fieldErrors: {},
};

/** Step-level validation (Arabic, unit-tested). */
export function validateMerchantOnboardingStep(
  draft: MerchantProfileDraft,
  step: MerchantOnboardingStep,
): Partial<Record<string, string>> {
  const all = validateMerchantDraft(draft);
  switch (step) {
    case 'identity':
      return {
        ...(all.businessNameAr ? { businessNameAr: all.businessNameAr } : {}),
        ...(all.cityAr ? { cityAr: all.cityAr } : {}),
      };
    case 'business':
      return {}; // bio optional (documented as nullable)
    case 'contact':
      return all.phoneAr ? { phoneAr: all.phoneAr } : {};
    case 'review':
      return all;
  }
}

export function merchantOnboardingReducer(
  state: MerchantOnboardingState,
  event: MerchantOnboardingEvent,
): MerchantOnboardingState {
  switch (event.type) {
    case 'SET_TEXT':
      return {
        ...state,
        fieldErrors: {},
        stepError: null,
        draft: { ...state.draft, [event.field]: event.text },
      };
    case 'NEXT': {
      const errors = validateMerchantOnboardingStep(state.draft, state.step);
      if (Object.keys(errors).length > 0) {
        const first = Object.values(errors)[0];
        return { ...state, fieldErrors: errors, stepError: first ?? 'راجع البيانات المدخلة' };
      }
      const next = MERCHANT_ONBOARDING_STEPS[MERCHANT_ONBOARDING_STEPS.indexOf(state.step) + 1];
      if (next === undefined) return state;
      return { ...state, step: next, fieldErrors: {}, stepError: null };
    }
    case 'BACK': {
      const index = MERCHANT_ONBOARDING_STEPS.indexOf(state.step);
      if (index <= 0) return state;
      const prev = MERCHANT_ONBOARDING_STEPS[index - 1];
      if (prev === undefined) return state;
      return { ...state, step: prev, fieldErrors: {}, stepError: null };
    }
    case 'GOTO': {
      const from = MERCHANT_ONBOARDING_STEPS.indexOf(state.step);
      const to = MERCHANT_ONBOARDING_STEPS.indexOf(event.step);
      if (to < from) return { ...state, step: event.step, fieldErrors: {}, stepError: null };
      if (to === from) return state;
      for (let i = from; i < to; i += 1) {
        const current = MERCHANT_ONBOARDING_STEPS[i];
        if (current === undefined) return state;
        const errors = validateMerchantOnboardingStep(state.draft, current);
        if (Object.keys(errors).length > 0) {
          const first = Object.values(errors)[0];
          return { ...state, fieldErrors: errors, stepError: first ?? 'راجع البيانات المدخلة' };
        }
      }
      return { ...state, step: event.step, fieldErrors: {}, stepError: null };
    }
  }
}
