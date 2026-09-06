/**
 * View-model hook for Technician Discovery (search + profile share
 * one data lifecycle: the technician list).
 *
 * The hook owns loading/error/retry. Filtering is the pure
 * `applyTechnicianFilters` so screens stay thin and logic stays
 * unit-tested.
 */

import { useCallback, useEffect, useState } from 'react';

import { MockTechnicianDataSource } from './mock-technician-data-source';

import type { Technician } from './technician-types';

export type TechniciansStatus = 'loading' | 'loaded' | 'error';

export interface TechniciansState {
  status: TechniciansStatus;
  data: ReadonlyArray<Technician> | null;
  error: Error | null;
  retry: () => void;
}

export function useTechniciansViewModel(): TechniciansState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<TechniciansState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    new MockTechnicianDataSource()
      .getTechnicians({ role: 'customer' })
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'loaded', data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
