/**
 * View-model hook for the Technician Messages screen (T-G).
 * Data lifecycle only (loading / loaded / error + retry).
 */

import { useCallback, useEffect, useState } from 'react';

import { ApiTechnicianMessagesDataSource } from './api-technician-messages-data-source';

import type { TechnicianMessagesDataSource, TechnicianMessagesViewModel } from './technician-messages-types';

export type TechnicianMessagesStatus = 'loading' | 'loaded' | 'error';

export interface TechnicianMessagesState {
  status: TechnicianMessagesStatus;
  data: TechnicianMessagesViewModel | null;
  error: Error | null;
  retry: () => void;
}

export function useTechnicianMessagesViewModel(
  provided?: TechnicianMessagesDataSource,
): TechnicianMessagesState {
  const [source] = useState(() => provided ?? new ApiTechnicianMessagesDataSource());
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<TechnicianMessagesState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', data: null, error: null });
    source
      .getConversations({ role: 'technician' })
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
  }, [source, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { ...state, retry };
}
