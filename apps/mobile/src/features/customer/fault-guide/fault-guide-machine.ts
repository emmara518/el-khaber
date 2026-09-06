/**
 * Fault Guide state machine — pure reducer (unit-tested).
 *
 *   APPLIANCE → SYMPTOM → LOADING → RESULT
 *                            ↘ NO_MATCH
 *                            ↘ ERROR →(retry)→ LOADING
 *
 * BACK never dead-ends: RESULT/NO_MATCH/ERROR → SYMPTOM,
 * SYMPTOM → APPLIANCE. RESTART always returns to APPLIANCE with a
 * cleared selection.
 */

import type { ApplianceSlug } from '../home/data/customer-home-types';

export type FaultGuideStep =
  | 'APPLIANCE'
  | 'SYMPTOM'
  | 'LOADING'
  | 'RESULT'
  | 'NO_MATCH'
  | 'ERROR';

export interface FaultGuideState {
  readonly step: FaultGuideStep;
  readonly appliance: ApplianceSlug | null;
  readonly symptomId: string | null;
}

export type FaultGuideEvent =
  | { readonly type: 'SELECT_APPLIANCE'; readonly slug: ApplianceSlug }
  | { readonly type: 'SELECT_SYMPTOM'; readonly symptomId: string }
  | { readonly type: 'RESOLVE'; readonly found: boolean }
  | { readonly type: 'FAIL' }
  | { readonly type: 'BACK' }
  | { readonly type: 'RESTART' }
  | { readonly type: 'RETRY' };

export const INITIAL_FAULT_GUIDE_STATE: FaultGuideState = {
  step: 'APPLIANCE',
  appliance: null,
  symptomId: null,
};

export function faultGuideReducer(
  state: FaultGuideState,
  event: FaultGuideEvent,
): FaultGuideState {
  switch (event.type) {
    case 'SELECT_APPLIANCE':
      return { step: 'SYMPTOM', appliance: event.slug, symptomId: null };
    case 'SELECT_SYMPTOM':
      if (state.step !== 'SYMPTOM' || state.appliance === null) return state;
      return { ...state, step: 'LOADING', symptomId: event.symptomId };
    case 'RESOLVE':
      if (state.step !== 'LOADING') return state;
      return { ...state, step: event.found ? 'RESULT' : 'NO_MATCH' };
    case 'FAIL':
      if (state.step !== 'LOADING') return state;
      return { ...state, step: 'ERROR' };
    case 'BACK':
      if (state.step === 'SYMPTOM') {
        return { step: 'APPLIANCE', appliance: null, symptomId: null };
      }
      if (state.step === 'RESULT' || state.step === 'NO_MATCH' || state.step === 'ERROR') {
        return { ...state, step: 'SYMPTOM' };
      }
      return state;
    case 'RESTART':
      return INITIAL_FAULT_GUIDE_STATE;
    case 'RETRY':
      if (state.step !== 'ERROR') return state;
      return { ...state, step: 'LOADING' };
  }
}
