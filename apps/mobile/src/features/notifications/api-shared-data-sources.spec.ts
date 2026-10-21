/**
 * Mapper tests for the reconciled notifications adapter + shared
 * subscription copy (Task 10J).
 *
 * NOTE: an earlier in-progress draft (`api-notifications-data-source.ts`,
 * a duplicate adapter) was removed during reconciliation — the single
 * implementation under test is `notifications-data-source.ts`, which the
 * shared ViewModel (`use-notifications-view-model.ts`) consumes.
 */

import { describe, expect, it } from 'vitest';

import { paymentStatusAr, subscriptionStatusAr } from '../subscriptions/subscription-types';

import { mapNotification } from './notifications-data-source';

import type { NotificationDto } from '@khabir/shared-types';

function makeDto(overrides: Partial<NotificationDto> = {}): NotificationDto {
  return {
    id: 'n1',
    titleAr: 'عنوان',
    bodyAr: 'نص',
    type: 'request.accepted',
    createdAt: '2026-01-01T00:00:00.000Z',
    readAt: null,
    dataJson: null,
    ...overrides,
  };
}

describe('notifications-data-source mappers', () => {
  it('marks read state from readAt', () => {
    const unread = mapNotification(makeDto());
    expect(unread.read).toBe(false);
    expect(unread.id).toBe('n1');
    expect(unread.titleAr).toBe('عنوان');

    const read = mapNotification(makeDto({ readAt: '2026-01-02T00:00:00.000Z' }));
    expect(read.read).toBe(true);
  });

  it('covers every subscription/payment status with Arabic copy', () => {
    expect(subscriptionStatusAr('active')).toBe('نشطة');
    expect(subscriptionStatusAr('pending')).toBe('بانتظار التفعيل');
    expect(subscriptionStatusAr('trialing')).toBe('فترة تجريبية');
    expect(subscriptionStatusAr('past_due')).toBe('متأخرة السداد');
    expect(subscriptionStatusAr('cancelled')).toBe('ملغاة');
    expect(subscriptionStatusAr('expired')).toBe('منتهية');
    expect(paymentStatusAr('pending')).toBe('قيد المراجعة');
    expect(paymentStatusAr('approved')).toBe('مقبول');
    expect(paymentStatusAr('rejected')).toBe('مرفوض');
  });
});
