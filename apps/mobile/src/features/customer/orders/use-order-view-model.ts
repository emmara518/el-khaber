/**
 * View-model hook for order detail loading.
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiOrderDataSource } from './api-order-data-source';

import type { OrderDataSource, OrderDetail } from './order-detail-types';

export type OrderDetailStatus = 'loading' | 'loaded' | 'missing' | 'error';

export interface OrderDetailState {
  status: OrderDetailStatus;
  data: OrderDetail | null;
  error: Error | null;
  retry: () => void;
}

export function useOrderViewModel(
  requestId: string,
  source: OrderDataSource = new ApiOrderDataSource(),
): OrderDetailState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<OrderDetailState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    source
      .getOrderDetail({ role: 'customer', requestId })
      .then((data) => {
        if (cancelled) return;
        if (data === null) {
          setState({ status: 'missing', data: null, error: null });
        } else {
          setState({ status: 'loaded', data, error: null });
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
