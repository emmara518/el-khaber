/**
 * Notifications service (Task 10H). Source: docs/07_API.md §12.
 * Persistence + read APIs only — NO delivery provider (Expo/FCM/APNs/
 * email/SMS are later platform decisions). `type` is an open string until
 * product trigger types are ratified (nothing invented here).
 */

import { buildPageMeta } from '@khabir/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';


import { PrismaService } from '../database/prisma.service';

import type { NotificationDto } from '@khabir/shared-types';
import type { Prisma } from '@prisma/client';

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  titleAr: true,
  bodyAr: true,
  dataJson: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    userId: string,
    query: { page: number; limit: number },
  ): Promise<{ items: NotificationDto[]; meta: ReturnType<typeof buildPageMeta> }> {
    const { page, limit } = query;
    const where: Prisma.NotificationWhereInput = { userId };
    const [total, rows] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: NOTIFICATION_SELECT,
      }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        type: r.type,
        titleAr: r.titleAr,
        bodyAr: r.bodyAr,
        dataJson: (r.dataJson ?? null) as Record<string, unknown> | null,
        readAt: r.readAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: buildPageMeta(page, limit, total),
    };
  }

  /** Recipient-only, idempotent mark-read (owner scope in the same write). */
  async markRead(userId: string, id: string): Promise<NotificationDto> {
    const updated = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    if (updated.count === 0) {
      // Another recipient's notification ≡ missing (no existence leak).
      throw new NotFoundException('Notification not found');
    }
    const row = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: NOTIFICATION_SELECT,
    });
    if (row === null) {
      throw new NotFoundException('Notification not found');
    }
    return {
      id: row.id,
      type: row.type,
      titleAr: row.titleAr,
      bodyAr: row.bodyAr,
      dataJson: (row.dataJson ?? null) as Record<string, unknown> | null,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Marks ALL of the recipient's unread notifications read. */
  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
