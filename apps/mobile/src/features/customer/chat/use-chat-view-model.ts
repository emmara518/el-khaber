/**
 * View-model hook for the contextual chat dialog.
 *
 * Owns history loading + the send lifecycle (idle → sending →
 * sent | error → retry). Accepts a data-source override so error
 * paths are verifiable without touching shipped UI.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  markMessage,
  withPendingMessage,
  type ChatDataSource,
  type ChatMessage,
} from './chat-types';
import { MockChatDataSource } from './mock-chat-data-source';

export type ChatLoadStatus = 'loading' | 'loaded' | 'error';

export interface ChatViewModel {
  loadStatus: ChatLoadStatus;
  loadError: Error | null;
  reload: () => void;
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
  source: ChatDataSource = new MockChatDataSource(),
): ChatViewModel {
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
    source
      .getMessages({ role: 'customer', conversationId })
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, attempt]);

  const deliver = useCallback(
    (pendingId: string, textAr: string) => {
      setSending(true);
      setSendError(null);
      void (async () => {
        try {
          const sent = await source.sendMessage({ role: 'customer', conversationId, textAr });
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
    [source, conversationId],
  );

  const send = useCallback(() => {
    const textAr = draft.trim();
    if (textAr.length === 0 || sending) return;
    const { next, pendingId } = withPendingMessage(messages, conversationId, textAr);
    setMessages(next);
    setDraft('');
    deliver(pendingId, textAr);
  }, [draft, sending, messages, conversationId, deliver]);

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
    messages,
    draft,
    setDraft,
    sending,
    sendError,
    send,
    retryFailed,
  };
}
