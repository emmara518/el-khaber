import { useEffect, useState } from 'react';

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
}

/**
 * View-model hook for the Customer Home screen.
 *
 * The hook owns only the data lifecycle. The presenter (the Home
 * screen component) reads `status` and `data` and renders the
 * appropriate state. The data source is currently a mock; when the
 * real API is wired, the data source implementation is swapped and
 * the hook contract does not change.
 */
export function useCustomerHomeViewModel(): CustomerHomeViewModelState {
  const [state, setState] = useState<CustomerHomeViewModelState>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const source: CustomerHomeDataSource = new ApiCustomerHomeDataSource();
    setState({ status: 'loading', data: null, error: null });
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
  }, []);

  return state;
}
