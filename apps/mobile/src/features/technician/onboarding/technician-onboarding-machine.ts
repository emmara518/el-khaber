/**
 * Technician onboarding machine — pure reducer (unit-tested).
 *
 * Steps: info → specialty → appliances → services → areas →
 * review. One draft; Next validates the current step, Back/Goto
 * preserve everything. Submission lives in the hook (idle →
 * submitting → submitted | error) so the reducer stays synchronous
 * and fully testable.
 */

import {
  EMPTY_PROFILE_DRAFT,
  toggleStringList,
  validateProfileDraft,
  type TechnicianProfileDraft,
} from '../profile/technician-profile-types';

import type { ApplianceSlug } from '../../customer/home/data/customer-home-types';

export const ONBOARDING_STEPS = [
  'info',
  'specialty',
  'appliances',
  'services',
  'areas',
  'review',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export interface OnboardingState {
  readonly step: OnboardingStep;
  readonly draft: TechnicianProfileDraft;
  readonly stepError: string | null;
  readonly fieldErrors: Partial<Record<string, string>>;
}

export type OnboardingEvent =
  | { readonly type: 'SET_TEXT'; readonly field: 'displayNameAr' | 'phoneAr' | 'bioAr'; readonly text: string }
  | { readonly type: 'SET_EXPERIENCE'; readonly years: number | null }
  | { readonly type: 'TOGGLE_SPECIALTY'; readonly value: string }
  | { readonly type: 'TOGGLE_APPLIANCE'; readonly value: ApplianceSlug }
  | { readonly type: 'TOGGLE_SERVICE'; readonly value: string }
  | { readonly type: 'TOGGLE_AREA'; readonly value: string }
  | { readonly type: 'NEXT' }
  | { readonly type: 'BACK' }
  | { readonly type: 'GOTO'; readonly step: OnboardingStep };

export const INITIAL_ONBOARDING_STATE: OnboardingState = {
  step: 'info',
  draft: EMPTY_PROFILE_DRAFT,
  stepError: null,
  fieldErrors: {},
};

/** Step-level validation messages (Arabic, unit-tested). */
export function validateOnboardingStep(
  draft: TechnicianProfileDraft,
  step: OnboardingStep,
): Partial<Record<string, string>> {
  const all = validateProfileDraft(draft);
  switch (step) {
    case 'info': {
      const errors: Partial<Record<string, string>> = {};
      if (all.displayNameAr) errors.displayNameAr = all.displayNameAr;
      if (all.phoneAr) errors.phoneAr = all.phoneAr;
      if (all.experienceYears) errors.experienceYears = all.experienceYears;
      return errors;
    }
    case 'specialty':
      return all.specialtiesAr ? { specialtiesAr: all.specialtiesAr } : {};
    case 'appliances':
      return all.appliances ? { appliances: all.appliances } : {};
    case 'services':
      return all.servicesAr ? { servicesAr: all.servicesAr } : {};
    case 'areas':
      return all.areasAr ? { areasAr: all.areasAr } : {};
    case 'review':
      return all;
  }
}

export function onboardingReducer(
  state: OnboardingState,
  event: OnboardingEvent,
): OnboardingState {
  switch (event.type) {
    case 'SET_TEXT':
      return {
        ...state,
        fieldErrors: {},
        stepError: null,
        draft: { ...state.draft, [event.field]: event.text },
      };
    case 'SET_EXPERIENCE':
      return {
        ...state,
        fieldErrors: {},
        stepError: null,
        draft: { ...state.draft, experienceYears: event.years },
      };
    case 'TOGGLE_SPECIALTY':
      return {
        ...state,
        fieldErrors: {},
        stepError: null,
        draft: { ...state.draft, specialtiesAr: toggleStringList(state.draft.specialtiesAr, event.value) },
      };
    case 'TOGGLE_APPLIANCE':
      return {
        ...state,
        fieldErrors: {},
        stepError: null,
        draft: { ...state.draft, appliances: toggleStringList(state.draft.appliances, event.value) },
      };
    case 'TOGGLE_SERVICE':
      return {
        ...state,
        fieldErrors: {},
        stepError: null,
        draft: { ...state.draft, servicesAr: toggleStringList(state.draft.servicesAr, event.value) },
      };
    case 'TOGGLE_AREA':
      return {
        ...state,
        fieldErrors: {},
        stepError: null,
        draft: { ...state.draft, areasAr: toggleStringList(state.draft.areasAr, event.value) },
      };
    case 'NEXT': {
      const errors = validateOnboardingStep(state.draft, state.step);
      if (Object.keys(errors).length > 0) {
        return { ...state, fieldErrors: errors, stepError: firstError(errors) };
      }
      const next = ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(state.step) + 1];
      if (next === undefined) return state;
      return { ...state, step: next, fieldErrors: {}, stepError: null };
    }
    case 'BACK': {
      const index = ONBOARDING_STEPS.indexOf(state.step);
      if (index <= 0) return state;
      const prev = ONBOARDING_STEPS[index - 1];
      if (prev === undefined) return state;
      return { ...state, step: prev, fieldErrors: {}, stepError: null };
    }
    case 'GOTO': {
      const from = ONBOARDING_STEPS.indexOf(state.step);
      const to = ONBOARDING_STEPS.indexOf(event.step);
      if (to < from) return { ...state, step: event.step, fieldErrors: {}, stepError: null };
      if (to === from) return state;
      for (let i = from; i < to; i += 1) {
        const current = ONBOARDING_STEPS[i];
        if (current === undefined) return state;
        const errors = validateOnboardingStep(state.draft, current);
        if (Object.keys(errors).length > 0) {
          return { ...state, fieldErrors: errors, stepError: firstError(errors) };
        }
      }
      return { ...state, step: event.step, fieldErrors: {}, stepError: null };
    }
  }
}

function firstError(errors: Partial<Record<string, string>>): string {
  const first = Object.values(errors)[0];
  return first ?? 'راجع البيانات المدخلة';
}
