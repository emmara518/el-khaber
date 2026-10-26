/**
 * Shared notifications ViewModel (Task 10J + WP-Notifications).
 *
 * Data lifecycle only behind the `NotificationsDataSource` interface —
 * screens never call HTTP directly and no second client exists.
 *
 * WP-Notifications behavior:
 * - paginated list (page 1 on mount, `loadMore` appends, deduped by id —
 *   refresh / load-more retries never duplicate items),
 * - server-authoritative `unreadCount` (GET /notifications/unread-count,
 *   refreshed after every read mutation),
 * - read mutations apply ONLY after the server confirms success (no
 *   optimistic fake-read; failures surface via `mutationError`).
 */

import { useCallback, useEffect, useState } from 'react';

import { toUserMessage } from '../../lib/api-error';

import {
  ApiNotificationsDataSource,
  NOTIFICATIONS_PAGE_LIMIT,
  mergeNotificationItems,
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
  /** True while an additional page is being fetched. */
  loadingMore: boolean;
  /** True when the server reports another page. */
  hasMore: boolean;
  /** Appends the next page (deduped); no-op while loading or exhausted. */
  loadMore: () => void;
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    setData(null);
    setPage(1);
    setHasMore(false);
    setLoadingMore(false);
    void (async () => {
      try {
        const [first, count] = await Promise.all([
          stableSource.listPage({ role, page: 1, limit: NOTIFICATIONS_PAGE_LIMIT }),
          stableSource.getUnreadCount({ role }),
        ]);
        if (cancelled) return;
        setData(first.items);
        setHasMore(first.hasNext);
        setUnreadCount(count.unread);
        setStatus('loaded');
      } catch (err: unknown) {
        if (cancelled) return;
        // Fallback: keep the badge truthful even if the count endpoint
        // fails while the list succeeds (and vice versa) — try each
        // independently before surfacing the error state.
        try {
          const first = await stableSource.listPage({
            role,
            page: 1,
            limit: NOTIFICATIONS_PAGE_LIMIT,
          });
          if (cancelled) return;
          setData(first.items);
          setHasMore(first.hasNext);
          setUnreadCount(first.items.filter((item) => !item.read).length);
          setStatus('loaded');
        } catch (fallbackErr: unknown) {
          if (cancelled) return;
          setError(fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)));
          setStatus('error');
        }
        void err;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stableSource, role, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const refreshUnread = useCallback(async () => {
    try {
      const count = await stableSource.getUnreadCount({ role });
      setUnreadCount(count.unread);
    } catch {
      // Badge keeps its last truthful value; list state is unaffected.
    }
  }, [stableSource, role]);

  const loadMore = useCallback(() => {
    if (status !== 'loaded' || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setMutationError(null);
    void (async () => {
      try {
        const next = await stableSource.listPage({
          role,
          page: page + 1,
          limit: NOTIFICATIONS_PAGE_LIMIT,
        });
        setData((current) => mergeNotificationItems(current ?? [], next.items));
        setPage((p) => p + 1);
        setHasMore(next.hasNext);
      } catch (err: unknown) {
        setMutationError(toUserMessage(err, 'تعذر تحميل المزيد'));
      } finally {
        setLoadingMore(false);
      }
    })();
  }, [status, loadingMore, hasMore, stableSource, role, page]);

  const markRead = useCallback(
    (notificationId: string) => {
      setMutationError(null);
      void (async () => {
        try {
          const updated = await stableSource.markRead({ role, notificationId });
          setData((current) =>
            (current ?? []).map((item) => (item.id === updated.id ? updated : item)),
          );
          await refreshUnread();
        } catch (err: unknown) {
          setMutationError(toUserMessage(err, 'تعذر تحديث الإشعار'));
        }
      })();
    },
    [stableSource, role, refreshUnread],
  );

  const markAllRead = useCallback(() => {
    setMutationError(null);
    void (async () => {
      try {
        await stableSource.markAllRead({ role });
        setData((current) => (current ?? []).map((item) => ({ ...item, read: true })));
        await refreshUnread();
      } catch (err: unknown) {
        setMutationError(toUserMessage(err, 'تعذر تحديث الإشعارات'));
      }
    })();
  }, [stableSource, role, refreshUnread]);

  return {
    status,
    data,
    unreadCount,
    error,
    retry,
    markRead,
    markAllRead,
    mutationError,
    loadingMore,
    hasMore,
    loadMore,
  };
}
