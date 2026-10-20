/**
 * WP-Notifications: preference-store reliability at the service layer.
 *
 * - A healthy store gates `request_status` / `subscription` writes.
 * - An UNREADABLE store (e.g. migration not yet deployed) must never
 *   block the business mutation or lose its notification: `create`
 *   fails OPEN with the documented defaults (all ON) and still persists.
 *
 * Uses the in-memory FakePrismaClient — no database required.
 */

import { describe, expect, it } from 'vitest';

import { NotificationsService } from '../dist/notifications/notifications.service';

import { createFakePrisma } from './fake-prisma';

describe('notification preference reliability', () => {
  it('fails OPEN with defaults when the preference store is unreadable', async () => {
    const prisma = createFakePrisma();
    const broken = Object.assign(Object.create(Object.getPrototypeOf(prisma)), prisma, {
      notificationPreference: {
        findUnique: async (): Promise<never> => {
          throw new Error('relation "notification_preferences" does not exist');
        },
      },
    });
    const service = new NotificationsService(broken as never);

    const result = await service.create('user-1', {
      type: 'request_status',
      titleAr: 'تم قبول طلب الخدمة',
      bodyAr: 'قبل الفني طلبك.',
      dataJson: { serviceRequestId: 'req-1' },
    });

    expect(result.delivered).toBe(true);
    expect(typeof result.id).toBe('string');
    expect(prisma.notificationRows.filter((n) => n.userId === 'user-1')).toHaveLength(1);
  });

  it('gates subscription writes when the store is healthy', async () => {
    const prisma = createFakePrisma();
    prisma.notificationPreferenceRows.push({
      userId: 'user-2',
      requestStatus: true,
      subscription: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const service = new NotificationsService(prisma as never);

    const suppressed = await service.create('user-2', {
      type: 'subscription',
      titleAr: 'تم تفعيل اشتراكك',
      bodyAr: 'تم التفعيل.',
    });
    expect(suppressed).toEqual({ id: null, delivered: false });
    expect(prisma.notificationRows).toHaveLength(0);

    const delivered = await service.create('user-2', {
      type: 'request_status',
      titleAr: 'تم قبول طلب الخدمة',
      bodyAr: 'قبل الفني طلبك.',
    });
    expect(delivered.delivered).toBe(true);
    expect(prisma.notificationRows).toHaveLength(1);
  });
});
