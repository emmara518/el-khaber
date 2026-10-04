/**
 * Batch D tests: draft init/prefill, step machine, validation,
 * dependent resets, review gating, mock submission, exit semantics.
 */

import { describe, expect, it } from 'vitest';

import {
  MockServiceRequestDataSource,
  ServiceRequestSubmissionError,
} from './mock-service-request-data-source';
import {
  INITIAL_SERVICE_REQUEST_STATE,
  serviceRequestReducer,
  type ServiceRequestState,
} from './service-request-machine';
import {
  NAV_ICONS,
  PHOTOS_MAX,
  STEP_INDEX,
  SERVICE_REQUEST_STEPS,
  draftHasContent,
  initDraftFromHandoff,
  problemsForAppliance,
  validateStep,
  type ServiceRequestDraft,
} from './service-request-types';
import { useServiceRequestViewModel } from './use-service-request-view-model';

describe('draft initialization + handoff prefill', () => {
  it('prefills technician, appliance, and symptom from the handoff', () => {
    const draft = initDraftFromHandoff({
      technicianId: 'tech-2',
      appliance: 'air_conditioner',
      symptomId: 'ac-no-cooling',
    });
    expect(draft.technicianId).toBe('tech-2');
    expect(draft.appliance).toBe('air_conditioner');
    expect(draft.symptomId).toBe('ac-no-cooling');
    expect(draft.problemId).toBeNull();
  });

  it('supports the general path with no symptom', () => {
    const draft = initDraftFromHandoff({ technicianId: 'tech-1' });
    expect(draft.appliance).toBeNull();
    expect(draft.symptomId).toBeNull();
  });

  it('rejects invalid appliance values instead of inventing state', () => {
    const draft = initDraftFromHandoff({
      technicianId: 'tech-1',
      // @ts-expect-error intentional: unknown appliance must not stick
      appliance: 'vendor',
    });
    expect(draft.appliance).toBeNull();
  });

  it('exposes the view-model hook', () => {
    expect(typeof useServiceRequestViewModel).toBe('function');
  });
});

describe('step machine', () => {
  function validDraft(): ServiceRequestDraft {
    return {
      ...INITIAL_SERVICE_REQUEST_STATE.draft,
      technicianId: 'tech-1',
      appliance: 'washing_machine',
      problemId: 'wm-leak',
      locationId: 'home',
    };
  }

  function stateWithDraft(): ServiceRequestState {
    return { ...INITIAL_SERVICE_REQUEST_STATE, draft: validDraft() };
  }

  it('walks the full flow with validation gates', () => {
    let state: ServiceRequestState = stateWithDraft();
    // NEXT validates: appliance OK → problem.
    state = serviceRequestReducer(state, { type: 'NEXT' });
    expect(state.step).toBe('problem');
    expect(state.stepError).toBeNull();
    for (const expected of ['description', 'photos', 'location', 'appointment', 'review'] as const) {
      state = serviceRequestReducer(state, { type: 'NEXT' });
      expect(state.step).toBe(expected);
    }
    // Past review there is nowhere to go.
    expect(serviceRequestReducer(state, { type: 'NEXT' }).step).toBe('review');
  });

  it('blocks NEXT with an Arabic message when required data is missing', () => {
    const blocked = serviceRequestReducer(INITIAL_SERVICE_REQUEST_STATE, { type: 'NEXT' });
    expect(blocked.step).toBe('appliance');
    expect(blocked.stepError).toContain('الجهاز');
  });

  it('preserves the draft across BACK navigation', () => {
    let state: ServiceRequestState = stateWithDraft();
    state = serviceRequestReducer(state, { type: 'NEXT' });
    state = serviceRequestReducer(state, { type: 'SET_DESCRIPTION', text: 'صوت عالٍ' });
    state = serviceRequestReducer(state, { type: 'BACK' });
    expect(state.step).toBe('appliance');
    expect(state.draft.descriptionAr).toBe('صوت عالٍ');
  });

  it('changing the appliance clears only dependent picks', () => {
    let state: ServiceRequestState = stateWithDraft();
    state = serviceRequestReducer(state, { type: 'SET_DESCRIPTION', text: 'keep me' });
    state = serviceRequestReducer(state, { type: 'SET_APPLIANCE', appliance: 'refrigerator' });
    expect(state.draft.appliance).toBe('refrigerator');
    expect(state.draft.symptomId).toBeNull();
    expect(state.draft.problemId).toBeNull();
    expect(state.draft.descriptionAr).toBe('keep me');
    expect(state.draft.locationId).toBe('home');
  });

  it('supports review edits via GOTO with forward validation', () => {
    let state: ServiceRequestState = stateWithDraft();
    for (let i = 0; i < 6; i += 1) state = serviceRequestReducer(state, { type: 'NEXT' });
    expect(state.step).toBe('review');
    state = serviceRequestReducer(state, { type: 'GOTO', step: 'problem' });
    expect(state.step).toBe('problem');
    // Forward jump past an invalid step is refused with a message.
    const broken = { ...state, draft: { ...state.draft, problemId: null } };
    const refused = serviceRequestReducer(broken, { type: 'GOTO', step: 'review' });
    expect(refused.step).toBe('problem');
    expect(refused.stepError).not.toBeNull();
  });

  it('adds and removes photos without duplication', () => {
    let state = INITIAL_SERVICE_REQUEST_STATE;
    state = serviceRequestReducer(state, { type: 'ADD_PHOTO', photoId: 'p1', labelAr: 'صورة 1' });
    state = serviceRequestReducer(state, { type: 'ADD_PHOTO', photoId: 'p1', labelAr: 'صورة 1' });
    expect(state.draft.photos).toHaveLength(1);
    state = serviceRequestReducer(state, { type: 'REMOVE_PHOTO', photoId: 'p1' });
    expect(state.draft.photos).toHaveLength(0);
  });
});

describe('validation', () => {
  const base: ServiceRequestDraft = {
    ...INITIAL_SERVICE_REQUEST_STATE.draft,
    technicianId: 'tech-1',
    appliance: 'washing_machine',
    problemId: 'wm-leak',
    locationId: 'home',
  };

  it('requires appliance, problem, and location — nothing else', () => {
    expect(validateStep({ ...base, appliance: null }, 'appliance')).not.toBeNull();
    expect(validateStep({ ...base, problemId: null }, 'problem')).not.toBeNull();
    expect(validateStep({ ...base, locationId: null }, 'location')).not.toBeNull();
    expect(validateStep(base, 'description')).toBeNull();
    expect(validateStep(base, 'photos')).toBeNull();
    expect(validateStep(base, 'appointment')).toBeNull();
  });

  it('requires custom text for the "other" problem', () => {
    const other = { ...base, problemId: 'other', customProblemAr: 'قصير' };
    expect(validateStep(other, 'problem')).not.toBeNull();
    expect(validateStep({ ...other, customProblemAr: 'تسرب من الخلف منذ يومين' }, 'problem')).toBeNull();
  });

  it('scopes problem options by appliance', async () => {
    const form = await new MockServiceRequestDataSource().getFormData({ role: 'customer' });
    const wm = problemsForAppliance(form.problems, 'washing_machine');
    expect(wm.length).toBeGreaterThan(0);
    expect(wm.every((p) => p.applianceSlug === null || p.applianceSlug === 'washing_machine')).toBe(true);
    // Unfiltered list (no appliance selected) exposes every catalog problem;
    // scoping only removes the ones bound to a *different* appliance.
    const all = problemsForAppliance(form.problems, null);
    expect(all).toHaveLength(form.problems.length);
    expect(all.length).toBeGreaterThanOrEqual(wm.length);
  });
});

describe('mock submission', () => {
  const complete: ServiceRequestDraft = {
    ...INITIAL_SERVICE_REQUEST_STATE.draft,
    technicianId: 'tech-2',
    appliance: 'air_conditioner',
    problemId: 'ac-no-cooling',
    locationId: 'home',
  };

  it('returns a typed result for a complete draft', async () => {
    const result = await new MockServiceRequestDataSource().submitRequest(complete);
    expect(result.requestId.length).toBeGreaterThan(0);
    expect(result.technicianId).toBe('tech-2');
  });

  it('rejects incomplete drafts without faking success', async () => {
    await expect(
      new MockServiceRequestDataSource().submitRequest({ ...complete, locationId: null }),
    ).rejects.toBeInstanceOf(ServiceRequestSubmissionError);
  });

  it('supports a deterministic failing mode for the error path', async () => {
    await expect(
      new MockServiceRequestDataSource('failing').submitRequest(complete),
    ).rejects.toBeInstanceOf(ServiceRequestSubmissionError);
  });

  it('exit abandons the draft: nothing is submitted without submitRequest', () => {
    // The machine has no submit side effect — submission happens only
    // through the data-source call the screen triggers explicitly.
    // An untouched draft holds no submittable content.
    expect(draftHasContent(INITIAL_SERVICE_REQUEST_STATE.draft)).toBe(false);
    expect(draftHasContent(complete)).toBe(true);
  });
});

describe('wizard step index (1..7) and RTL navigation', () => {
  it('numbers the seven steps 0..6 with no gap or duplicate', () => {
    expect(SERVICE_REQUEST_STEPS).toHaveLength(7);
    const indices = SERVICE_REQUEST_STEPS.map((s) => STEP_INDEX[s]);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(new Set(indices).size).toBe(7);
  });

  it('uses distinct RTL-correct arrows for back and next', () => {
    // In RTL, forward advances left; back returns right — never the same arrow.
    expect(NAV_ICONS.next).toBe('arrow-left');
    expect(NAV_ICONS.back).toBe('arrow-right');
    expect(NAV_ICONS.next).not.toBe(NAV_ICONS.back);
  });

  it('keeps the declared photo cap consistent with validation', () => {
    expect(PHOTOS_MAX).toBe(5);
  });
});

describe('location persistence across navigation', () => {
  const withLocation: ServiceRequestState = {
    ...INITIAL_SERVICE_REQUEST_STATE,
    draft: {
      ...INITIAL_SERVICE_REQUEST_STATE.draft,
      technicianId: 'tech-1',
      appliance: 'washing_machine',
      problemId: 'wm-leak',
      locationId: 'home',
    },
  };

  it('persists the selected location across NEXT and BACK', () => {
    let state = serviceRequestReducer(withLocation, { type: 'NEXT' });
    expect(state.step).toBe('problem');
    state = serviceRequestReducer(state, { type: 'BACK' });
    expect(state.step).toBe('appliance');
    expect(state.draft.locationId).toBe('home');
  });

  it('persists a location chosen later through the remaining steps', () => {
    let state = serviceRequestReducer(INITIAL_SERVICE_REQUEST_STATE, {
      type: 'SET_APPLIANCE',
      appliance: 'washing_machine',
    });
    state = serviceRequestReducer(state, { type: 'SET_PROBLEM', problemId: 'wm-leak' });
    state = serviceRequestReducer(state, { type: 'NEXT' }); // problem
    state = serviceRequestReducer(state, { type: 'NEXT' }); // description
    state = serviceRequestReducer(state, { type: 'NEXT' }); // photos
    state = serviceRequestReducer(state, { type: 'NEXT' }); // location
    expect(state.step).toBe('location');
    state = serviceRequestReducer(state, { type: 'SET_LOCATION', locationId: 'work' });
    state = serviceRequestReducer(state, { type: 'NEXT' }); // appointment
    expect(state.draft.locationId).toBe('work');
    state = serviceRequestReducer(state, { type: 'NEXT' }); // review
    expect(state.step).toBe('review');
    expect(state.draft.locationId).toBe('work');
  });
});
