/**
 * Shared notifications domain for the Mobile roles (Task 10J).
 *
 * No notifications UI exists in the current frontend — every role's
 * settings/profile surface renders the honest notifications placeholder.
 * This module supplies the real API-backed DataSource + ViewModel behind
 * that contract so the placeholder rows read real data (list / read /
 * read-all) WITHOUT adding new screens or redesigning the product:
 *
 * - UI (existing placeholder rows) → ViewModel (here)
 * - → NotificationsDataSource interface → ApiNotificationsDataSource
 * - → existing API client (`getApi`, one-shot 401 refresh preserved)
 * - → NestJS GET /notifications, POST /notifications/:id/read,
 *   POST /notifications/read-all → PostgreSQL.
 *
 * Backend contract (docs/07 §12, NotificationsController):
 * - GET /notifications?page=&limit= — own notifications, paginated,
 *   newest-first, server-computed meta (§19),
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

import type { NotificationDto } from '@khabir/shared-types';

export type NotificationsRole = 'customer' | 'technician' | 'merchant';

export interface NotificationItem {
  readonly id: string;
  readonly titleAr: string;
  readonly bodyAr: string;
  readonly type: string;
  readonly read: boolean;
  readonly timeAr: string;
}

export interface NotificationsDataSource {
  getNotifications(input: { role: NotificationsRole }): Promise<ReadonlyArray<NotificationItem>>;
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
  };
}

const LIST_FALLBACK_AR = 'تعذر تحميل الإشعارات. تحقق من الاتصال وحاول مجددًا';
const READ_FALLBACK_AR = 'تعذر تحديث الإشعار. حاول مجددًا';

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
