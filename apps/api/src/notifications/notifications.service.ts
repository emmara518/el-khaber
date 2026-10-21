/**
 * Notifications service (Task 10H). Source: docs/07_API.md §12.
 * Persistence + read APIs only — NO delivery provider (Expo/FCM/APNs/
 * email/SMS are later platform decisions). `type` is an open string until
 * product trigger types are ratified (nothing invented here).
 *
 * Task 10M adds the server-authoritative WRITE path (`create`) reused by
 * business-event wiring (service requests, subscriptions, admin grants).
 * The `type` values remain the constrained set already used by the system
 * (see `notification-events.ts`).
 *
 * WP-Notifications adds:
 * - `getUnreadCount` — server-authoritative unread badge (no full drain).
 * - per-user delivery preferences (`notification_preferences`, ADDITIVE
 *   migration 20261013000000): the two USER-TOGGLABLE families
 *   (`request_status`, `subscription`) are gated at WRITE time.
 *   `verification` decisions + admin operational messages are MANDATORY
 *   and bypass preferences (no key exists for them).
 * - navigation `dataJson` on every business notification (ids only —
 *   never PII, phones, emails, tokens, or secrets).
 */

import { buildPageMeta } from '@khabir/shared-types';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';


import { PrismaService } from '../database/prisma.service';

import type { NotificationDto } from '@khabir/shared-types';
import type { Prisma } from '@prisma/client';

/** Server-authoritative notification content (type + Arabic copy). */
export interface NotificationContent {
  type: string;
  titleAr: string;
  bodyAr: string;
  dataJson?: Record<string, unknown> | null;
}

/** User delivery preferences (WP-Notifications). Defaults: all ON. */
export interface NotificationPreferences {
  requestStatus: boolean;
  subscription: boolean;
}

export const DEFAULT_PREFERENCES: Readonly<NotificationPreferences> = {
  requestStatus: true,
  subscription: true,
};

/**
 * Maps a notification `type` to its preference key. `null` = MANDATORY
 * (verification decisions, admin operational messages) — always delivered.
 */
function preferenceKeyForType(type: string): keyof NotificationPreferences | null {
  if (type === 'request_status') return 'requestStatus';
  if (type === 'subscription') return 'subscription';
  return null;
}

/** Keys that must never appear in navigation `dataJson` (PII/secret guard). */
const FORBIDDEN_DATA_KEYS = /phone|email|password|token|secret|otp|hash|address/i;

/** Strips PII-looking keys from navigation payloads (defense in depth). */
function sanitizeDataJson(data: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (data === undefined || data === null) return null;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (FORBIDDEN_DATA_KEYS.test(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      clean[key] = value;
    }
  }
  return clean;
}

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  titleAr: true,
  bodyAr: true,
  dataJson: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

/** Result of a preference-gated write. `delivered: false` = suppressed by preference. */
export interface NotificationWriteResult {
  id: string | null;
  delivered: boolean;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Server-authoritative notification write (Task 10M + WP-Notifications).
   * Callers never accept recipient/type/content from the client — they pass
   * a server-derived `userId` and a content object built by trusted logic.
   *
   * Preference gating (WP-Notifications): `request_status` and `subscription`
   * notifications are suppressed when the recipient disabled that family.
   * The BUSINESS STATE mutation still commits (the caller owns the tx) —
   * only the notification row is skipped. `verification` + admin operational
   * types bypass gating (mandatory).
   *
   * When the notification corresponds to a business state mutation, the
   * enclosing transaction client MUST be passed as `tx` so the state change
   * and the notification commit or roll back together (no silent
   * "state changed but notification missing"). A stale/duplicate action
   * mutates nothing and therefore never emits a phantom notification.
   */
  async create(
    userId: string,
    content: NotificationContent,
    tx?: Prisma.TransactionClient,
  ): Promise<NotificationWriteResult> {
    const key = preferenceKeyForType(content.type);
    if (key !== null) {
      let prefs: NotificationPreferences;
      try {
        // Intentionally NON-transactional even when `tx` is present: the
        // preference row is not part of the business invariant, and a
        // failed read inside the caller's transaction would poison it
        // (Postgres 25P02) and roll back the business mutation. The
        // notification WRITE below still uses `tx` (atomic with the
        // state change); only the best-effort gate reads committed state.
        prefs = await this.readPreferences(userId);
      } catch (err: unknown) {
        // Reliability (WP-Notifications §7): the preferences store must
        // never block a business mutation or lose its notification. When
        // the store is unreadable (e.g. migration not yet deployed in the
        // environment), fail OPEN with the documented defaults (all ON)
        // and log loudly instead of rolling back the enclosing tx.
        this.logger.warn(
          `notification preferences unreadable for type=${content.type}; delivering with defaults. ${(err as Error)?.message ?? err}`,
        );
        prefs = { ...DEFAULT_PREFERENCES };
      }
      if (prefs[key] === false) {
        return { id: null, delivered: false };
      }
    }
    const client = tx ?? this.prisma;
    const sanitized = sanitizeDataJson(content.dataJson);
    const row = await client.notification.create({
      data: {
        userId,
        type: content.type,
        titleAr: content.titleAr,
        bodyAr: content.bodyAr,
        ...(sanitized !== null ? { dataJson: sanitized as never } : {}),
      },
      select: { id: true },
    });
    return { id: row.id, delivered: true };
  }

  /** Reads preferences (committed state; absent row ≡ defaults). */
  private async readPreferences(userId: string): Promise<NotificationPreferences> {
    const row = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (row === null) return { ...DEFAULT_PREFERENCES };
    return { requestStatus: row.requestStatus, subscription: row.subscription };
  }

  /** Returns the recipient's preferences (absent row ≡ all ON). */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    return this.readPreferences(userId);
  }

  /** Replaces the recipient's preferences (both keys required, validated by zod). */
  async updatePreferences(userId: string, input: NotificationPreferences): Promise<NotificationPreferences> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, requestStatus: input.requestStatus, subscription: input.subscription },
      update: { requestStatus: input.requestStatus, subscription: input.subscription },
      select: { requestStatus: true, subscription: true },
    });
    return { requestStatus: row.requestStatus, subscription: row.subscription };
  }

  /** Server-authoritative unread count for the badge (no full list drain). */
  async getUnreadCount(userId: string): Promise<{ unread: number }> {
    const unread = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { unread };
  }

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
