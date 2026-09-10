/**
 * View-model hook for the merchant catalog (list + detail).
 * Data lifecycle only (loading / loaded / error + retry); filtering
 * stays in the pure `filterMerchantProducts`.
 */

import { useCallback, useEffect, useState } from 'react';

import { MockMerchantProductsDataSource, type MerchantProductsDataSource } from './mock-merchant-products-data-source';

import type { MerchantProduct } from './merchant-product-types';

export type MerchantProductsStatus = 'loading' | 'loaded' | 'error';

export interface MerchantProductsState {
  status: MerchantProductsStatus;
  data: ReadonlyArray<MerchantProduct> | null;
  error: Error | null;
  retry: () => void;
}

export function useMerchantProductsViewModel(
  source: MerchantProductsDataSource = new MockMerchantProductsDataSource(),
): MerchantProductsState {
  const [stableSource] = useState(() => source);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<MerchantProductsState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    stableSource
      .getProducts({ role: 'merchant' })
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
