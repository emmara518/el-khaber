/**
 * Shared notifications domain for the Mobile roles (Task 10J + WP-Notifications).
 *
 * Real API-backed DataSource behind the `NotificationsDataSource` interface:
 *
 * - UI → ViewModel → NotificationsDataSource → ApiNotificationsDataSource
 * - → existing API client (`getApi`, one-shot 401 refresh preserved)
 * - → NestJS GET /notifications (paginated), GET /notifications/unread-count,
 *   GET|PUT /notifications/preferences, POST /notifications/:id/read,
 *   POST /notifications/read-all → PostgreSQL.
 *
 * Backend contract (docs/07 §12, NotificationsController):
 * - GET /notifications?page=&limit= — own notifications, paginated,
 *   newest-first, server-computed meta (§19),
 * - GET /notifications/unread-count — server-authoritative `{ unread }`
 *   for the badge (no full list drain),
 * - GET|PUT /notifications/preferences — own delivery preferences
 *   (`requestStatus`, `subscription`; verification + admin operational
 *   stay MANDATORY with no key),
 * - POST /notifications/:id/read — recipient-only, idempotent,
 *   another user's notification ≡ 404,
 * - POST /notifications/read-all — marks all own unread read.
 *
 * At this stage `persisted ≠ delivered` — no push provider exists.
 */

import { getApi } from '../../lib/api-client';
import { toUserMessage } from '../../lib/api-error';
import { formatArDateTime } from '../../lib/api-format';
import { buildQuery, drainPages } from '../../lib/api-query';

import type {
  NotificationDto,
  NotificationPreferencesDto,
  UnreadCountDto,
} from '@khabir/shared-types';

export type NotificationsRole = 'customer' | 'technician' | 'merchant';

export interface NotificationItem {
  readonly id: string;
  readonly titleAr: string;
  readonly bodyAr: string;
  readonly type: string;
  readonly read: boolean;
  readonly timeAr: string;
  /** Raw navigation payload from the server (ids only, never PII). */
  readonly dataJson: Record<string, unknown> | null;
}

export interface NotificationPage {
  readonly items: ReadonlyArray<NotificationItem>;
  readonly total: number;
  readonly hasNext: boolean;
}

/** User-togglable delivery preferences (WP-Notifications). */
export interface NotificationPreferences {
  readonly requestStatus: boolean;
  readonly subscription: boolean;
}

export interface NotificationsDataSource {
  getNotifications(input: { role: NotificationsRole }): Promise<ReadonlyArray<NotificationItem>>;
  listPage(input: {
    role: NotificationsRole;
    page: number;
    limit: number;
  }): Promise<NotificationPage>;
  getUnreadCount(input: { role: NotificationsRole }): Promise<{ unread: number }>;
  getPreferences(input: { role: NotificationsRole }): Promise<NotificationPreferences>;
  updatePreferences(input: {
    role: NotificationsRole;
    preferences: NotificationPreferences;
  }): Promise<NotificationPreferences>;
  markRead(input: { role: NotificationsRole; notificationId: string }): Promise<NotificationItem>;
  markAllRead(input: { role: NotificationsRole }): Promise<{ updated: number }>;
}

export function mapNotification(dto: NotificationDto): NotificationItem {
  return {
    id: dto.id,
    titleAr: dto.titleAr,
    bodyAr: dto.bodyAr,
    type: dto.type,
    read: dto.readAt !== null,
    timeAr: formatArDateTime(dto.createdAt),
    dataJson: dto.dataJson,
  };
}

/**
 * Merges pages without duplicates (WP-Notifications): later fetches
 * (refresh / load-more retries) never duplicate an already-loaded id.
 * First occurrence wins so server order (newest-first) is preserved.
 */
export function mergeNotificationItems(
  current: ReadonlyArray<NotificationItem>,
  incoming: ReadonlyArray<NotificationItem>,
): ReadonlyArray<NotificationItem> {
  if (current.length === 0) return incoming;
  const seen = new Set(current.map((item) => item.id));
  const merged: NotificationItem[] = [...current];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

const LIST_FALLBACK_AR = 'تعذر تحميل الإشعارات. تحقق من الاتصال وحاول مجددًا';
const READ_FALLBACK_AR = 'تعذر تحديث الإشعار. حاول مجددًا';
const PREFS_FALLBACK_AR = 'تعذر تحميل تفضيلات الإشعارات. حاول مجددًا';
const PREFS_SAVE_FALLBACK_AR = 'تعذر حفظ التفضيلات. حاول مجددًا';

/** Page size for the notification center (bounded, server max 100). */
export const NOTIFICATIONS_PAGE_LIMIT = 20;

/** Real API adapter — recipient-scoped reads only; no delivery provider. */
export class ApiNotificationsDataSource implements NotificationsDataSource {
  async getNotifications(input: { role: NotificationsRole }): Promise<ReadonlyArray<NotificationItem>> {
    void input.role; // recipient identity is server-derived from the JWT
    try {
      const items = await drainPages<NotificationDto>((page, limit) =>
        getApi()
          .request<NotificationDto[]>('GET', `/notifications${buildQuery({ page, limit })}`)
          .then((res) => ({ items: res.data, meta: res.meta })),
      );
      return items.map(mapNotification);
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, LIST_FALLBACK_AR));
    }
  }

  async listPage(input: {
    role: NotificationsRole;
    page: number;
    limit: number;
  }): Promise<NotificationPage> {
    void input.role; // recipient identity is server-derived from the JWT
    try {
      const res = await getApi().request<NotificationDto[]>(
        'GET',
        `/notifications${buildQuery({ page: input.page, limit: input.limit })}`,
      );
      return {
        items: res.data.map(mapNotification),
        total: res.meta?.total ?? res.data.length,
        hasNext: res.meta?.hasNext ?? false,
      };
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, LIST_FALLBACK_AR));
    }
  }

  async getUnreadCount(input: { role: NotificationsRole }): Promise<{ unread: number }> {
    void input.role;
    try {
      const res = await getApi().request<UnreadCountDto>('GET', '/notifications/unread-count');
      return { unread: res.data.unread };
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, LIST_FALLBACK_AR));
    }
  }

  async getPreferences(input: { role: NotificationsRole }): Promise<NotificationPreferences> {
    void input.role;
    try {
      const res = await getApi().request<NotificationPreferencesDto>(
        'GET',
        '/notifications/preferences',
      );
      return { requestStatus: res.data.requestStatus, subscription: res.data.subscription };
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, PREFS_FALLBACK_AR));
    }
  }

  async updatePreferences(input: {
    role: NotificationsRole;
    preferences: NotificationPreferences;
  }): Promise<NotificationPreferences> {
    void input.role;
    try {
      const res = await getApi().request<NotificationPreferencesDto>(
        'PUT',
        '/notifications/preferences',
        {
          requestStatus: input.preferences.requestStatus,
          subscription: input.preferences.subscription,
        },
      );
      return { requestStatus: res.data.requestStatus, subscription: res.data.subscription };
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, PREFS_SAVE_FALLBACK_AR));
    }
  }

  async markRead(input: { role: NotificationsRole; notificationId: string }): Promise<NotificationItem> {
    void input.role;
    try {
      const res = await getApi().request<NotificationDto>(
        'POST',
        `/notifications/${input.notificationId}/read`,
      );
      return mapNotification(res.data);
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, READ_FALLBACK_AR));
    }
  }

  async markAllRead(input: { role: NotificationsRole }): Promise<{ updated: number }> {
    void input.role;
    try {
      const res = await getApi().request<{ updated: number }>('POST', '/notifications/read-all');
      return { updated: res.data.updated };
    } catch (err: unknown) {
      throw new Error(toUserMessage(err, READ_FALLBACK_AR));
    }
  }
}
