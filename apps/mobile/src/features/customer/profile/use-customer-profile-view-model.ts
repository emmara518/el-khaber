/**
 * View-model hook for the Customer Profile screen.
 * Data lifecycle only (loading / loaded / error + retry).
 */

import { useCallback, useEffect, useState } from 'react';

import { MockCustomerProfileDataSource } from './mock-customer-profile-data-source';

import type { CustomerProfileSummary } from './customer-profile-types';

export type CustomerProfileStatus = 'loading' | 'loaded' | 'error';

export interface CustomerProfileState {
  status: CustomerProfileStatus;
  data: CustomerProfileSummary | null;
  error: Error | null;
  retry: () => void;
}

export function useCustomerProfileViewModel(): CustomerProfileState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<CustomerProfileState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const source = new MockCustomerProfileDataSource();
    setState({ status: 'loading', data: null, error: null });
    source
      .getProfile({ role: 'customer' })
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
