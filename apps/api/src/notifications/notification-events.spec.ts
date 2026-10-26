/**
 * Unit tests — notification event copy (Batch 2).
 *
 * Locks the contract that the Arabic title NEVER carries an admin reason,
 * note, or internal identifier, while the body carries the optional reason
 * exactly once. Pure functions; no database.
 */

import { describe, expect, it } from 'vitest';

import {
  NOTIFICATION_TYPE,
  entitlementGrantedNotification,
  paymentApprovedNotification,
  paymentRejectedNotification,
  requestAssignedNotification,
  requestStatusNotification,
  subscriptionActivatedNotification,
  subscriptionRenewalCancelledNotification,
  verificationNotification,
} from './notification-events';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const REASON = 'الإيصال غير مقروء';
const NOTE = 'تمت المراجعة يدويًا';

describe('notification-events — request status copy', () => {
  it('every status produces a request_status notification with Arabic copy', () => {
    const statuses = ['pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'] as const;
    for (const status of statuses) {
      const content = requestStatusNotification(status);
      expect(content.type).toBe(NOTIFICATION_TYPE.requestStatus);
      expect(content.titleAr.length).toBeGreaterThan(0);
      expect(content.bodyAr.length).toBeGreaterThan(0);
    }
  });

  it('assignment copy is request_status for both recipients', () => {
    for (const kind of ['technician', 'customer'] as const) {
      const content = requestAssignedNotification(kind);
      expect(content.type).toBe(NOTIFICATION_TYPE.requestStatus);
      expect(content.titleAr.length).toBeGreaterThan(0);
    }
  });
});

describe('notification-events — payment decisions', () => {
  it('approval without a note uses the base copy', () => {
    const content = paymentApprovedNotification();
    expect(content.type).toBe(NOTIFICATION_TYPE.subscription);
    expect(content.titleAr).toBe('تم اعتماد عملية الدفع');
    expect(content.bodyAr).toBe('تم اعتماد عملية الدفع وتفعيل الاشتراك.');
  });

  it('approval note lands in the body only, never the title', () => {
    const content = paymentApprovedNotification(`  ${NOTE}  `);
    expect(content.titleAr).not.toContain(NOTE);
    expect(content.bodyAr).toContain(`ملاحظة: ${NOTE}`);
    expect(content.bodyAr.endsWith(`ملاحظة: ${NOTE}`)).toBe(true);
  });

  it('rejection reason lands in the body only, never the title', () => {
    const content = paymentRejectedNotification(REASON);
    expect(content.type).toBe(NOTIFICATION_TYPE.subscription);
    expect(content.titleAr).toBe('تم رفض إثبات الدفع');
    expect(content.titleAr).not.toContain(REASON);
    expect(content.bodyAr).toContain(`السبب: ${REASON}`);
  });

  it('empty or whitespace reasons are ignored', () => {
    for (const blank of ['', '   ']) {
      const approved = paymentApprovedNotification(blank);
      const rejected = paymentRejectedNotification(blank);
      expect(approved.bodyAr).not.toContain('ملاحظة:');
      expect(rejected.bodyAr).not.toContain('السبب:');
    }
  });
});

describe('notification-events — verification decisions', () => {
  it('each decision maps to verification type with Arabic copy', () => {
    for (const status of ['verified', 'rejected', 'suspended'] as const) {
      const content = verificationNotification(status);
      expect(content.type).toBe(NOTIFICATION_TYPE.verification);
      expect(content.titleAr.length).toBeGreaterThan(0);
      expect(content.bodyAr.length).toBeGreaterThan(0);
    }
  });

  it('decision reason is appended to the body, never the title', () => {
    const content = verificationNotification('rejected', REASON);
    expect(content.titleAr).not.toContain(REASON);
    expect(content.bodyAr).toContain(`السبب: ${REASON}`);
  });
});

describe('notification-events — subscription events', () => {
  it('activation, renewal cancellation and grants keep the subscription type', () => {
    for (const content of [
      subscriptionActivatedNotification(),
      subscriptionRenewalCancelledNotification(),
      entitlementGrantedNotification('دعم ذو أولوية'),
    ]) {
      expect(content.type).toBe(NOTIFICATION_TYPE.subscription);
      expect(content.titleAr.length).toBeGreaterThan(0);
    }
  });

  it('entitlement name appears in the body', () => {
    const content = entitlementGrantedNotification('دعم ذو أولوية');
    expect(content.bodyAr).toContain('دعم ذو أولوية');
  });

  it('no copy leaks UUIDs or internal identifiers', () => {
    const contents = [
      requestStatusNotification('completed'),
      paymentApprovedNotification(NOTE),
      paymentRejectedNotification(REASON),
      verificationNotification('suspended', REASON),
      subscriptionActivatedNotification(),
      entitlementGrantedNotification('ميزة'),
    ];
    for (const content of contents) {
      expect(content.titleAr).not.toMatch(UUID_RE);
      expect(content.bodyAr).not.toMatch(UUID_RE);
    }
  });
});
