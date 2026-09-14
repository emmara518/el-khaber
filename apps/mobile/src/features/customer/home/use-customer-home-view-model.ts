import { useCallback, useEffect, useState } from 'react';

import { ApiCustomerHomeDataSource } from './api-customer-home-data-source';

import type {
  CustomerHomeDataSource,
  CustomerHomeViewModel,
} from './data/customer-home-types';

export type CustomerHomeStatus = 'loading' | 'loaded' | 'error';

export interface CustomerHomeViewModelState {
  status: CustomerHomeStatus;
  data: CustomerHomeViewModel | null;
  error: Error | null;
  reload: () => void;
}

/**
 * View-model hook for the Customer Home screen.
 *
 * The hook owns only the data lifecycle. The presenter (the Home
 * screen component) reads `status` and `data` and renders the
 * appropriate state. The data source is the real API adapter.
 */
export function useCustomerHomeViewModel(): CustomerHomeViewModelState {
  const [state, setState] = useState<CustomerHomeViewModelState>({
    status: 'loading',
    data: null,
    error: null,
  });

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const source: CustomerHomeDataSource = new ApiCustomerHomeDataSource();
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    source
      .getHome({ role: 'customer' })
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

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, reload };
}
