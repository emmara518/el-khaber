/**
 * View-model hooks for the public store (Phase D).
 *
 * Data lifecycle only (loading / loaded / error + retry), mirroring the
 * merchant catalog hook. The store is read-only: no mutations.
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiStoreDataSource } from './api-store-data-source';

import type { StoreDataSource, StoreProduct } from './store-types';

type StoreRole = 'customer' | 'technician';

export type StoreListStatus = 'loading' | 'loaded' | 'error';
export type StoreDetailStatus = 'loading' | 'loaded' | 'not-found' | 'error';

export interface StoreListState {
  status: StoreListStatus;
  data: ReadonlyArray<StoreProduct> | null;
  error: Error | null;
  retry: () => void;
}

export interface StoreDetailState {
  status: StoreDetailStatus;
  data: StoreProduct | null;
  error: Error | null;
  retry: () => void;
}

export function useStoreViewModel(
  role: StoreRole,
  source: StoreDataSource = new ApiStoreDataSource(),
): StoreListState {
  const [stableSource] = useState(() => source);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<StoreListState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    stableSource
      .getProducts({ role })
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'loaded', data, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', data: null, error: err instanceof Error ? err : new Error(String(err)) });
      });
    return () => {
      cancelled = true;
    };
  }, [stableSource, role, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}

export function useStoreProductViewModel(
  role: StoreRole,
  productId: string,
  source: StoreDataSource = new ApiStoreDataSource(),
): StoreDetailState {
  const [stableSource] = useState(() => source);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<StoreDetailState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    stableSource
      .getProduct(productId)
      .then((data) => {
        if (cancelled) return;
        setState(
          data === null
            ? { status: 'not-found', data: null, error: null }
            : { status: 'loaded', data, error: null },
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', data: null, error: err instanceof Error ? err : new Error(String(err)) });
      });
    return () => {
      cancelled = true;
    };
  }, [stableSource, role, productId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
