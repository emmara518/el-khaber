/**
 * View-model hook for Technician Discovery (search + profile share
 * one data lifecycle: the technician list).
 *
 * WP-Discovery: every filter is sent to GET /technicians — the hook
 * owns loading/error/retry over the server result. Filtering is never
 * re-applied client-side (that would hide valid matches outside the
 * loaded window).
 */

import { useCallback, useEffect, useState } from 'react';

import { toUserError } from '../../../lib/api-error';

import { ApiTechnicianDataSource } from './api-technician-data-source';

import type { Technician, TechnicianListQuery } from './technician-types';

export type TechniciansStatus = 'loading' | 'loaded' | 'error';

export interface TechniciansState {
  status: TechniciansStatus;
  data: ReadonlyArray<Technician> | null;
  error: Error | null;
  retry: () => void;
}

export function useTechniciansViewModel(filters?: TechnicianListQuery): TechniciansState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<TechniciansState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });
  const key = JSON.stringify(filters ?? null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    new ApiTechnicianDataSource()
      .getTechnicians({
        role: 'customer',
        ...(filters !== undefined ? { filters } : {}),
      })
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'loaded', data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          data: null,
          error: toUserError(err, 'تعذّر تحميل الفنيين. حاول مرة أخرى.'),
        });
      });
    return () => {
      cancelled = true;
    };
    // `key` is the stable serialization of the filter object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
