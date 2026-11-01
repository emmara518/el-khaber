/**
 * View-model hook for order detail loading.
 */

import { useCallback, useEffect, useState } from 'react';

import { toUserError, toUserMessage } from '../../../lib/api-error';

import { ApiOrderDataSource } from './api-order-data-source';

import type { OrderDataSource, OrderDetail } from './order-detail-types';

export type OrderDetailStatus = 'loading' | 'loaded' | 'missing' | 'error';
export type OrderCancelStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface OrderDetailState {
  status: OrderDetailStatus;
  data: OrderDetail | null;
  error: Error | null;
  retry: () => void;
  cancelStatus: OrderCancelStatus;
  cancelError: string | null;
  cancel: () => void;
}

export function useOrderViewModel(
  requestId: string,
  source: OrderDataSource = new ApiOrderDataSource(),
): OrderDetailState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<
    Omit<OrderDetailState, 'retry' | 'cancelStatus' | 'cancelError' | 'cancel'>
  >({
    status: 'loading',
    data: null,
    error: null,
  });
  const [cancelStatus, setCancelStatus] = useState<OrderCancelStatus>('idle');
  const [cancelError, setCancelError] = useState<string | null>(null);

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
          error: toUserError(err, 'ØªØ¹Ø°Ù‘Ø± ØªØ­Ù…ÙŠÙ„ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø·Ù„Ø¨. Ø­Ø§ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰.'),
        });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const cancel = useCallback(() => {
    if (cancelStatus === 'submitting' || cancelStatus === 'success') return;
    setCancelStatus('submitting');
    setCancelError(null);
    void source
      .cancelOrder({ role: 'customer', requestId })
      .then(() => {
        setCancelStatus('success');
        setAttempt((n) => n + 1);
      })
      .catch((err: unknown) => {
        setCancelError(toUserMessage(err, 'تعذر إلغاء الطلب. حاول مرة أخرى'));
        setCancelStatus('error');
      });
  }, [cancelStatus, requestId, source]);

  return { ...state, retry, cancelStatus, cancelError, cancel };
}
