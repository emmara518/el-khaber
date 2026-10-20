/**
 * View-model hook for the contextual chat dialog.
 *
 * Owns history loading + the send lifecycle (idle → sending →
 * sent | error → retry). Accepts a data-source override so error
 * paths are verifiable without touching shipped UI.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiChatDataSource } from './api-chat-data-source';
import {
  markMessage,
  mergeChatMessages,
  withPendingMessage,
  type ChatDataSource,
  type ChatMessage,
  type ChatRole,
} from './chat-types';
import {
  ALWAYS_ACTIVE_APP_STATE,
  CHAT_POLL_INTERVAL_MS,
  startMessagePolling,
  type ChatAppState,
  type MessagePolling,
} from './message-polling';

export type ChatLoadStatus = 'loading' | 'loaded' | 'error';

export interface ChatViewModel {
  loadStatus: ChatLoadStatus;
  loadError: Error | null;
  reload: () => void;
  /** Refresh the history now (focus return) without a loading flash. */
  refresh: () => void;
  messages: ReadonlyArray<ChatMessage>;
  draft: string;
  setDraft: (text: string) => void;
  sending: boolean;
  sendError: string | null;
  send: () => void;
  retryFailed: (id: string) => void;
}

export function useChatViewModel(
  conversationId: string,
  role: ChatRole = 'customer',
  source: ChatDataSource = new ApiChatDataSource(),
  appState: ChatAppState = ALWAYS_ACTIVE_APP_STATE,
  isFocused: () => boolean = () => true,
): ChatViewModel {
  // Stabilize the source across renders so the loader never
  // re-triggers from an inline default.
  const [stableSource] = useState(() => source);
  const [attempt, setAttempt] = useState(0);
  const [loadStatus, setLoadStatus] = useState<ChatLoadStatus>('loading');
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<ReadonlyArray<ChatMessage>>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadStatus('loading');
    setLoadError(null);
    stableSource
      .getMessages({ role, conversationId })
      .then((history) => {
        if (cancelled) return;
        setMessages(history);
        setLoadStatus('loaded');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err : new Error(String(err)));
        setLoadStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [stableSource, role, conversationId, attempt]);

  // Poll while the dialog is mounted; pause in the background. A
  // successful poll also recovers a failed initial load.
  const pollingRef = useRef<MessagePolling | null>(null);

  useEffect(() => {
    const polling = startMessagePolling<ReadonlyArray<ChatMessage>>({
      intervalMs: CHAT_POLL_INTERVAL_MS,
      fetch: () => stableSource.getMessages({ role, conversationId }),
      onData: (history) => {
        setMessages((current) => mergeChatMessages(current, history));
        setLoadStatus('loaded');
        setLoadError(null);
      },
      onError: () => undefined,
      // Never poll while the screen is blurred or the app is backgrounded.
      isActive: () => appState.isActive() && isFocused(),
    });
    pollingRef.current = polling;
    const unsubscribe = appState.subscribe(() => polling.refresh());
    return () => {
      polling.stop();
      pollingRef.current = null;
      unsubscribe();
    };
  }, [stableSource, role, conversationId, appState, isFocused]);

  const refresh = useCallback(() => {
    pollingRef.current?.refresh();
  }, []);

  const deliver = useCallback(
    (pendingId: string, textAr: string) => {
      setSending(true);
      setSendError(null);
      void (async () => {
        try {
          const sent = await stableSource.sendMessage({ role, conversationId, textAr });
          setMessages((current) =>
            markMessage(current, pendingId, { id: sent.id, status: 'sent', timeAr: sent.timeAr }),
          );
        } catch (err) {
          setMessages((current) => markMessage(current, pendingId, { status: 'error' }));
          setSendError(err instanceof Error ? err.message : 'فشل إرسال الرسالة');
        } finally {
          setSending(false);
        }
      })();
    },
    [stableSource, role, conversationId],
  );

  const send = useCallback(() => {
    const textAr = draft.trim();
    if (textAr.length === 0 || sending) return;
    const { next, pendingId } = withPendingMessage(messages, conversationId, textAr, role);
    setMessages(next);
    setDraft('');
    deliver(pendingId, textAr);
  }, [draft, sending, messages, conversationId, role, deliver]);

  const retryFailed = useCallback(
    (id: string) => {
      const failed = messages.find((m) => m.id === id && m.status === 'error');
      if (!failed || sending) return;
      setMessages((current) => markMessage(current, id, { status: 'sending' }));
      deliver(id, failed.textAr);
    },
    [messages, sending, deliver],
  );

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return {
    loadStatus,
    loadError,
    reload,
    refresh,
    messages,
    draft,
    setDraft,
    sending,
    sendError,
    send,
    retryFailed,
  };
}
