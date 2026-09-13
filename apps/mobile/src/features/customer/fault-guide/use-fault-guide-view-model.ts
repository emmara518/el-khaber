/**
 * View-model hook for the Fault Guide flow.
 *
 * Two async boundaries, both explicit:
 * 1. guide load on mount (loading / error+retry at screen level),
 * 2. symptom resolution (LOADING → RESULT / NO_MATCH / ERROR inside
 *    the `faultGuideReducer` machine).
 *
 * The hook never invents content: results come only from
 * `FaultGuideDataSource` lookups.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { ApiFaultGuideDataSource } from './api-fault-guide-data-source';
import {
  INITIAL_FAULT_GUIDE_STATE,
  faultGuideReducer,
  type FaultGuideStep,
} from './fault-guide-machine';
import {
  detailForSymptom,
  type FaultDetail,
  type FaultGuideData,
} from './fault-guide-types';

import type { ApplianceSlug } from '../home/data/customer-home-types';

export type GuideLoadStatus = 'loading' | 'loaded' | 'error';

export interface FaultGuideViewModel {
  loadStatus: GuideLoadStatus;
  loadError: Error | null;
  reload: () => void;
  data: FaultGuideData | null;
  step: FaultGuideStep;
  appliance: ApplianceSlug | null;
  symptomId: string | null;
  detail: FaultDetail | null;
  selectAppliance: (slug: ApplianceSlug) => void;
  selectSymptom: (symptomId: string) => void;
  back: () => void;
  restart: () => void;
  retryResolve: () => void;
}

/** Short artificial delay so the LOADING state is perceivable. */
const RESOLVE_DELAY_MS = 350;

export function useFaultGuideViewModel(): FaultGuideViewModel {
  const [attempt, setAttempt] = useState(0);
  const [loadStatus, setLoadStatus] = useState<GuideLoadStatus>('loading');
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [data, setData] = useState<FaultGuideData | null>(null);
  const [machine, dispatch] = useReducer(faultGuideReducer, INITIAL_FAULT_GUIDE_STATE);
  const resolveToken = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoadStatus('loading');
    setLoadError(null);
    setData(null);
    new ApiFaultGuideDataSource()
      .getGuide({ role: 'customer' })
      .then((guide) => {
        if (cancelled) return;
        setData(guide);
        setLoadStatus('loaded');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err : new Error(String(err)));
        setLoadStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const resolve = useCallback(
    (symptomId: string) => {
      const token = (resolveToken.current += 1);
      setTimeout(() => {
        if (token !== resolveToken.current || data === null) return;
        try {
          const detail = detailForSymptom(data.details, symptomId);
          dispatch({ type: 'RESOLVE', found: detail !== null });
        } catch {
          dispatch({ type: 'FAIL' });
        }
      }, RESOLVE_DELAY_MS);
    },
    [data],
  );

  // Re-resolve when (re-)entering LOADING (select or retry).
  useEffect(() => {
    if (machine.step === 'LOADING' && machine.symptomId !== null) {
      resolve(machine.symptomId);
    }
  }, [machine.step, machine.symptomId, resolve]);

  const reload = useCallback(() => {
    dispatch({ type: 'RESTART' });
    setAttempt((n) => n + 1);
  }, []);

  const retryResolve = useCallback(() => dispatch({ type: 'RETRY' }), []);

  const detail =
    machine.step === 'RESULT' && data !== null && machine.symptomId !== null
      ? detailForSymptom(data.details, machine.symptomId)
      : null;

  return {
    loadStatus,
    loadError,
    reload,
    data,
    step: machine.step,
    appliance: machine.appliance,
    symptomId: machine.symptomId,
    detail,
    selectAppliance: (slug) => dispatch({ type: 'SELECT_APPLIANCE', slug }),
    selectSymptom: (symptomId) => dispatch({ type: 'SELECT_SYMPTOM', symptomId }),
    back: () => dispatch({ type: 'BACK' }),
    restart: () => dispatch({ type: 'RESTART' }),
    retryResolve,
  };
}
