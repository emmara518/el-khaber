/**
 * Pure unit tests for the notifications domain (Task 10J).
 *
 * No network: a fake in-memory `NotificationsDataSource` drives the
 * adapter mapping contract (`mapNotification`) only.
 */

import { describe, expect, it } from 'vitest';

import { mapNotification } from './notifications-data-source';

import type { NotificationDto } from '@khabir/shared-types';

function dto(overrides: Partial<NotificationDto> = {}): NotificationDto {
  return {
    id: 'n-1',
    titleAr: 'تم قبول طلبك',
    bodyAr: 'الفني في الطريق إليك.',
    type: 'request_accepted',
    dataJson: null,
    readAt: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('mapNotification', () => {
  it('maps an unread notification with formatted time', () => {
    const item = mapNotification(dto());
    expect(item.id).toBe('n-1');
    expect(item.titleAr).toBe('تم قبول طلبك');
    expect(item.read).toBe(false);
    expect(item.timeAr.length).toBeGreaterThan(0);
  });

  it('maps a read notification as read', () => {
    const item = mapNotification(dto({ readAt: '2026-09-01T11:00:00.000Z' }));
    expect(item.read).toBe(true);
  });

  it('preserves the backend type string verbatim', () => {
    const item = mapNotification(dto({ type: 'custom_trigger' }));
    expect(item.type).toBe('custom_trigger');
  });
});
