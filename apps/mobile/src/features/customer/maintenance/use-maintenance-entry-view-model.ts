/**
 * View-model hook for the Maintenance entry screen.
 * Data lifecycle only (loading / loaded / error + retry).
 */

import { useCallback, useEffect, useState } from 'react';

import { MockMaintenanceEntryDataSource } from './mock-maintenance-entry-data-source';

import type { MaintenanceEntryViewModel } from './maintenance-entry-types';

export type MaintenanceEntryStatus = 'loading' | 'loaded' | 'error';

export interface MaintenanceEntryState {
  status: MaintenanceEntryStatus;
  data: MaintenanceEntryViewModel | null;
  error: Error | null;
  retry: () => void;
}

export function useMaintenanceEntryViewModel(): MaintenanceEntryState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<MaintenanceEntryState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const source = new MockMaintenanceEntryDataSource();
    setState({ status: 'loading', data: null, error: null });
    source
      .getEntry({ role: 'customer' })
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
