/**
 * View-model hook for the technician reviews screen.
 * Data lifecycle only (loading / loaded / error + retry).
 */

import { useCallback, useEffect, useState } from 'react';

import { MockTechnicianReviewsDataSource, type TechnicianReviewsDataSource } from './technician-reviews-types';

import type { TechnicianReviewsSummary } from './technician-reviews-types';

export type TechnicianReviewsStatus = 'loading' | 'loaded' | 'error';

export interface TechnicianReviewsState {
  status: TechnicianReviewsStatus;
  data: TechnicianReviewsSummary | null;
  error: Error | null;
  retry: () => void;
}

export function useTechnicianReviewsViewModel(
  source: TechnicianReviewsDataSource = new MockTechnicianReviewsDataSource(),
): TechnicianReviewsState {
  const [stableSource] = useState(() => source);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<TechnicianReviewsState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    stableSource
      .getReviews({ role: 'technician' })
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
  }, [stableSource, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
