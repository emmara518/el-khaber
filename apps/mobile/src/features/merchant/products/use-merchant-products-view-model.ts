/**
 * View-model hook for the merchant catalog (list + detail).
 * Data lifecycle only (loading / loaded / error + retry); filtering
 * stays in the pure `filterMerchantProducts`. WP-5C adds the
 * ownership-scoped delete (server truth; the deleted row is removed
 * from local state only after the server confirms).
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiMerchantProductsDataSource } from './api-merchant-products-data-source';

import type { MerchantProductDataSource } from './merchant-product-types';
import type { MerchantProduct, MerchantProductStatus } from './merchant-product-types';

export type MerchantProductsStatus = 'loading' | 'loaded' | 'error';
export type ProductMutationStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface MerchantProductsState {
  status: MerchantProductsStatus;
  data: ReadonlyArray<MerchantProduct> | null;
  error: Error | null;
  retry: () => void;
  mutationStatus: ProductMutationStatus;
  mutationError: string | null;
  mutationResult: MerchantProduct | null;
  setProductStatus: (productId: string, status: MerchantProductStatus) => void;
  resetMutation: () => void;
  deleteStatus: ProductMutationStatus;
  deleteError: string | null;
  deleteProduct: (productId: string) => void;
  resetDelete: () => void;
}

export function useMerchantProductsViewModel(
  source: MerchantProductDataSource = new ApiMerchantProductsDataSource(),
): MerchantProductsState {
  const [stableSource] = useState(() => source);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<
    Omit<
      MerchantProductsState,
      'retry' | 'setProductStatus' | 'resetMutation' | 'deleteProduct' | 'resetDelete'
    >
  >({
    status: 'loading',
    data: null,
    error: null,
    mutationStatus: 'idle',
    mutationError: null,
    mutationResult: null,
    deleteStatus: 'idle',
    deleteError: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading', data: null, error: null }));
    stableSource
      .getProducts({ role: 'merchant' })
      .then((data) => {
        if (cancelled) return;
        setState((s) => ({ ...s, status: 'loaded', data, error: null }));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState((s) => ({
          ...s,
          status: 'error',
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [stableSource, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const setProductStatus = useCallback(
    (productId: string, nextStatus: MerchantProductStatus) => {
      setState((s) => {
        if (s.mutationStatus === 'submitting') return s;
        return { ...s, mutationStatus: 'submitting', mutationError: null, mutationResult: null };
      });
      void (async () => {
        try {
          const updated = await stableSource.setProductStatus({
            role: 'merchant',
            productId,
            status: nextStatus,
          });
          setState((s) => ({
            ...s,
            data: (s.data ?? []).map((p) => (p.id === updated.id ? updated : p)),
            mutationStatus: 'success',
            mutationResult: updated,
          }));
        } catch (err: unknown) {
          setState((s) => ({
            ...s,
            mutationStatus: 'error',
            mutationError:
              err instanceof Error
                ? err.message
                : 'تعذر تحديث المنتج. حاول مجددًا',
          }));
        }
      })();
    },
    [stableSource],
  );

  const resetMutation = useCallback(() => {
    setState((s) => ({ ...s, mutationStatus: 'idle', mutationError: null, mutationResult: null }));
  }, []);

  const deleteProduct = useCallback(
    (productId: string) => {
      setState((s) => {
        if (s.deleteStatus === 'submitting') return s;
        return { ...s, deleteStatus: 'submitting', deleteError: null };
      });
      void (async () => {
        try {
          await stableSource.deleteProduct({ role: 'merchant', productId });
          // Remove from local state ONLY on server confirmation (no stale row).
          setState((s) => ({
            ...s,
            data: (s.data ?? []).filter((p) => p.id !== productId),
            deleteStatus: 'success',
          }));
        } catch (err: unknown) {
          setState((s) => ({
            ...s,
            deleteStatus: 'error',
            deleteError:
              err instanceof Error ? err.message : 'تعذر حذف المنتج. حاول مجددًا',
          }));
        }
      })();
    },
    [stableSource],
  );

  const resetDelete = useCallback(() => {
    setState((s) => ({ ...s, deleteStatus: 'idle', deleteError: null }));
  }, []);

  return { ...state, retry, setProductStatus, resetMutation, deleteProduct, resetDelete };
}
