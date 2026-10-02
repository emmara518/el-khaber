/**
 * View-model hook for the merchant messages list (Phase D).
 * Data lifecycle only (loading / loaded / error + retry).
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiMerchantMessagesDataSource } from './api-merchant-messages-data-source';

import type { MerchantMessagesDataSource, MerchantMessagesViewModel } from './merchant-messages-types';

export type MerchantMessagesStatus = 'loading' | 'loaded' | 'error';

export interface MerchantMessagesState {
  status: MerchantMessagesStatus;
  data: MerchantMessagesViewModel | null;
  error: Error | null;
  retry: () => void;
}

export function useMerchantMessagesViewModel(
  source: MerchantMessagesDataSource = new ApiMerchantMessagesDataSource(),
): MerchantMessagesState {
  const [stableSource] = useState(() => source);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<MerchantMessagesState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    stableSource
      .getConversations({ role: 'merchant' })
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
  }, [stableSource, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
