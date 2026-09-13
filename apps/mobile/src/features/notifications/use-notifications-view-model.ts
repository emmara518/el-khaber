/**
 * Shared notifications ViewModel (Task 10J).
 *
 * Data lifecycle only (loading / loaded / error + retry, read /
 * read-all mutations) behind the `NotificationsDataSource` interface —
 * screens never call HTTP directly and no second client exists.
 */

import { useCallback, useEffect, useState } from 'react';

import {
  ApiNotificationsDataSource,
  type NotificationItem,
  type NotificationsDataSource,
  type NotificationsRole,
} from './notifications-data-source';

export type NotificationsStatus = 'loading' | 'loaded' | 'error';

export interface NotificationsState {
  status: NotificationsStatus;
  data: ReadonlyArray<NotificationItem> | null;
  unreadCount: number;
  error: Error | null;
  retry: () => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  mutationError: string | null;
}

export function useNotificationsViewModel(
  role: NotificationsRole,
  source?: NotificationsDataSource,
): NotificationsState {
  const [stableSource] = useState<NotificationsDataSource>(
    () => source ?? new ApiNotificationsDataSource(),
  );
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<NotificationsStatus>('loading');
  const [data, setData] = useState<ReadonlyArray<NotificationItem> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    setData(null);
    stableSource
      .getNotifications({ role })
      .then((items) => {
        if (cancelled) return;
        setData(items);
        setStatus('loaded');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [stableSource, role, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const markRead = useCallback(
    (notificationId: string) => {
      setMutationError(null);
      void (async () => {
        try {
          const updated = await stableSource.markRead({ role, notificationId });
          setData((current) =>
            (current ?? []).map((item) => (item.id === updated.id ? updated : item)),
          );
        } catch (err: unknown) {
          setMutationError(err instanceof Error ? err.message : 'تعذر تحديث الإشعار');
        }
      })();
    },
    [stableSource, role],
  );

  const markAllRead = useCallback(() => {
    setMutationError(null);
    void (async () => {
      try {
        await stableSource.markAllRead({ role });
        setData((current) => (current ?? []).map((item) => ({ ...item, read: true })));
      } catch (err: unknown) {
        setMutationError(err instanceof Error ? err.message : 'تعذر تحديث الإشعارات');
      }
    })();
  }, [stableSource, role]);

  return {
    status,
    data,
    unreadCount: (data ?? []).filter((item) => !item.read).length,
    error,
    retry,
    markRead,
    markAllRead,
    mutationError,
  };
}
