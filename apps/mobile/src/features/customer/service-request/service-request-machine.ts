/**
 * Service Request draft machine — pure reducer (unit-tested).
 *
 * One coherent draft; Next/Back/Goto preserve everything.
 * Changing the appliance clears only dependent picks (symptom and
 * problem), never description/photos/location/appointment.
 */

import {
  initDraftFromHandoff,
  validateStep,
  type ServiceRequestDraft,
  type ServiceRequestHandoff,
  type ServiceRequestStep,
} from './service-request-types';

export interface ServiceRequestState {
  readonly step: ServiceRequestStep;
  readonly draft: ServiceRequestDraft;
  /** Validation message for the current step (null = clean). */
  readonly stepError: string | null;
}

export type ServiceRequestEvent =
  | { readonly type: 'INIT'; readonly handoff: ServiceRequestHandoff }
  | { readonly type: 'SET_APPLIANCE'; readonly appliance: ServiceRequestDraft['appliance'] }
  | { readonly type: 'SET_PROBLEM'; readonly problemId: string | null }
  | { readonly type: 'SET_CUSTOM_PROBLEM'; readonly text: string }
  | { readonly type: 'SET_DESCRIPTION'; readonly text: string }
  | { readonly type: 'ADD_PHOTO'; readonly photoId: string; readonly labelAr: string }
  | { readonly type: 'REMOVE_PHOTO'; readonly photoId: string }
  | { readonly type: 'SET_LOCATION'; readonly locationId: string }
  | { readonly type: 'SET_APPOINTMENT'; readonly slotId: string | null }
  | { readonly type: 'NEXT' }
  | { readonly type: 'BACK' }
  | { readonly type: 'GOTO'; readonly step: ServiceRequestStep };

const ORDER: ReadonlyArray<ServiceRequestStep> = [
  'appliance',
  'problem',
  'description',
  'photos',
  'location',
  'appointment',
  'review',
];

export const INITIAL_SERVICE_REQUEST_STATE: ServiceRequestState = {
  step: 'appliance',
  draft: {
    technicianId: '',
    appliance: null,
    symptomId: null,
    problemId: null,
    customProblemAr: '',
    descriptionAr: '',
    photos: [],
    locationId: null,
    appointmentSlotId: null,
  },
  stepError: null,
};

export function serviceRequestReducer(
  state: ServiceRequestState,
  event: ServiceRequestEvent,
): ServiceRequestState {
  switch (event.type) {
    case 'INIT':
      return { step: 'appliance', draft: initDraftFromHandoff(event.handoff), stepError: null };

    case 'SET_APPLIANCE': {
      if (event.appliance === state.draft.appliance) return state;
      return {
        ...state,
        stepError: null,
        draft: {
          ...state.draft,
          appliance: event.appliance,
          symptomId: null,
          problemId: null,
          customProblemAr: '',
        },
      };
    }

    case 'SET_PROBLEM':
      return { ...state, stepError: null, draft: { ...state.draft, problemId: event.problemId } };

    case 'SET_CUSTOM_PROBLEM':
      return { ...state, stepError: null, draft: { ...state.draft, customProblemAr: event.text } };

    case 'SET_DESCRIPTION':
      return { ...state, stepError: null, draft: { ...state.draft, descriptionAr: event.text } };

    case 'ADD_PHOTO':
      if (state.draft.photos.some((p) => p.id === event.photoId)) return state;
      return {
        ...state,
        stepError: null,
        draft: {
          ...state.draft,
          photos: [...state.draft.photos, { id: event.photoId, labelAr: event.labelAr }],
        },
      };

    case 'REMOVE_PHOTO':
      return {
        ...state,
        stepError: null,
        draft: { ...state.draft, photos: state.draft.photos.filter((p) => p.id !== event.photoId) },
      };

    case 'SET_LOCATION':
      return { ...state, stepError: null, draft: { ...state.draft, locationId: event.locationId } };

    case 'SET_APPOINTMENT':
      return { ...state, stepError: null, draft: { ...state.draft, appointmentSlotId: event.slotId } };

    case 'NEXT': {
      const error = validateStep(state.draft, state.step);
      if (error !== null) return { ...state, stepError: error };
      const next = ORDER[ORDER.indexOf(state.step) + 1];
      if (next === undefined) return state;
      return { ...state, step: next, stepError: null };
    }

    case 'BACK': {
      const index = ORDER.indexOf(state.step);
      if (index <= 0) return state;
      const prev = ORDER[index - 1];
      if (prev === undefined) return state;
      return { ...state, step: prev, stepError: null };
    }

    case 'GOTO': {
      // Review edits may jump to any earlier step; forward jumps
      // must pass validation of every intermediate step.
      const from = ORDER.indexOf(state.step);
      const to = ORDER.indexOf(event.step);
      if (to < from) return { ...state, step: event.step, stepError: null };
      if (to === from) return state;
      for (let i = from; i < to; i += 1) {
        const current = ORDER[i];
        if (current === undefined) return state;
        const error = validateStep(state.draft, current);
        if (error !== null) return { ...state, stepError: error };
      }
      return { ...state, step: event.step, stepError: null };
    }
  }
}
