/**
 * View-model hook for the Technician Home screen.
 * Data lifecycle (loading / loaded / error + retry) plus the WP-4
 * self-service availability mutation. The server response is always the
 * source of truth — there is no divergent optimistic state.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiTechnicianHomeDataSource } from './api-technician-home-data-source';
import { availabilityLabelAr } from './technician-home-types';

import type { TechnicianHomeDataSource, TechnicianHomeViewModel } from './technician-home-types';

export type TechnicianHomeStatus = 'loading' | 'loaded' | 'error';

export interface TechnicianHomeState {
  status: TechnicianHomeStatus;
  data: TechnicianHomeViewModel | null;
  error: Error | null;
  retry: () => void;
  availabilitySaving: boolean;
  availabilityError: string | null;
  setAvailability: (available: boolean) => void;
}

export function useTechnicianHomeViewModel(
  sourceOverride?: TechnicianHomeDataSource,
): TechnicianHomeState {
  const source = useMemo<TechnicianHomeDataSource>(
    () => sourceOverride ?? new ApiTechnicianHomeDataSource(),
    [sourceOverride],
  );
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<TechnicianHomeState, 'retry' | 'availabilitySaving' | 'availabilityError' | 'setAvailability'>>({
    status: 'loading',
    data: null,
    error: null,
  });
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    source
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
  }, [attempt, source]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const setAvailability = useCallback(
    (available: boolean) => {
      if (availabilitySaving) return;
      setAvailabilitySaving(true);
      setAvailabilityError(null);
      void (async () => {
        try {
          const { availabilityStatus } = await source.setAvailability({
            role: 'technician',
            available,
          });
          // Adopt the SERVER state (readback), never an optimistic guess.
          setState((current) =>
            current.data === null
              ? current
              : {
                  ...current,
                  data: {
                    ...current.data,
                    profile: {
                      ...current.data.profile,
                      available: availabilityStatus === 'available',
                      availabilityLabelAr: availabilityLabelAr(availabilityStatus),
                    },
                  },
                },
          );
        } catch (err) {
          setAvailabilityError(
            err instanceof Error ? err.message : 'تعذر تحديث حالة التوفر. حاول مجددًا',
          );
        } finally {
          setAvailabilitySaving(false);
        }
      })();
    },
    [source, availabilitySaving],
  );

  return { ...state, retry, availabilitySaving, availabilityError, setAvailability };
}
