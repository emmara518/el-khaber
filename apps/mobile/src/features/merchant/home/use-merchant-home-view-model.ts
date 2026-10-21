/**
 * View-model hook for the Merchant Home screen.
 * Data lifecycle only (loading / loaded / error + retry).
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiMerchantHomeDataSource } from './api-merchant-home-data-source';

import type { MerchantHomeViewModel } from './merchant-home-types';

export type MerchantHomeStatus = 'loading' | 'loaded' | 'error';

export interface MerchantHomeState {
  status: MerchantHomeStatus;
  data: MerchantHomeViewModel | null;
  error: Error | null;
  retry: () => void;
}

export function useMerchantHomeViewModel(): MerchantHomeState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<MerchantHomeState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    new ApiMerchantHomeDataSource()
      .getHome({ role: 'merchant' })
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
