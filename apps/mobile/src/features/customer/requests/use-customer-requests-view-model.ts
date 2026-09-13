/**
 * View-model hook for the Customer Requests screen.
 *
 * Owns the data lifecycle only (loading / loaded / error + retry).
 * Status filtering is a pure function (`filterRequestsByStatus`) so
 * it stays unit-testable without rendering.
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiCustomerRequestsDataSource } from './api-customer-requests-data-source';

import type { CustomerRequestsDataSource, CustomerRequestsViewModel } from './customer-requests-types';

export type CustomerRequestsStatus = 'loading' | 'loaded' | 'error';

export interface CustomerRequestsState {
  status: CustomerRequestsStatus;
  data: CustomerRequestsViewModel | null;
  error: Error | null;
  retry: () => void;
}

export function useCustomerRequestsViewModel(source?: CustomerRequestsDataSource): CustomerRequestsState {
  const [stableSource] = useState<CustomerRequestsDataSource>(() => source ?? new ApiCustomerRequestsDataSource());
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<CustomerRequestsState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    stableSource
      .getRequests({ role: 'customer' })
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
