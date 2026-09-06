/**
 * View-model hook for the Technician Home screen.
 * Data lifecycle only (loading / loaded / error + retry).
 */

import { useCallback, useEffect, useState } from 'react';

import { MockTechnicianHomeDataSource } from './mock-technician-home-data-source';

import type { TechnicianHomeViewModel } from './technician-home-types';

export type TechnicianHomeStatus = 'loading' | 'loaded' | 'error';

export interface TechnicianHomeState {
  status: TechnicianHomeStatus;
  data: TechnicianHomeViewModel | null;
  error: Error | null;
  retry: () => void;
}

export function useTechnicianHomeViewModel(): TechnicianHomeState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<TechnicianHomeState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    new MockTechnicianHomeDataSource()
      .getHome({ role: 'technician' })
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
