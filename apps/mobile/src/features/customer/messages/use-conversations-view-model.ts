/**
 * View-model hook for the Conversations screen.
 * Data lifecycle only (loading / loaded / error + retry).
 */

import { useCallback, useEffect, useState } from 'react';

import { MockConversationsDataSource } from './mock-conversations-data-source';

import type { ConversationsViewModel } from './conversations-types';

export type ConversationsStatus = 'loading' | 'loaded' | 'error';

export interface ConversationsState {
  status: ConversationsStatus;
  data: ConversationsViewModel | null;
  error: Error | null;
  retry: () => void;
}

export function useConversationsViewModel(): ConversationsState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<ConversationsState, 'retry'>>({
    status: 'loading',
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const source = new MockConversationsDataSource();
    setState({ status: 'loading', data: null, error: null });
    source
      .getConversations({ role: 'customer' })
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
