/**
 * Unit tests for notification deep-link resolution (WP-Notifications).
 *
 * Pure mapping: server `dataJson` (ids only) → role expo-router target.
 * No network, no navigation side effects.
 */

import { describe, expect, it } from 'vitest';

import { resolveNotificationTarget } from './notification-navigation';

describe('resolveNotificationTarget', () => {
  it('routes service requests per role', () => {
    const payload = { type: 'request_status', dataJson: { serviceRequestId: 'req-1', status: 'accepted' } };
    expect(resolveNotificationTarget('customer', payload)).toBe('/(customer)/requests/req-1');
    expect(resolveNotificationTarget('technician', payload)).toBe('/(technician)/orders/req-1');
    expect(resolveNotificationTarget('merchant', payload)).toBeNull();
  });

  it('routes subscription families per role', () => {
    const byId = { type: 'subscription', dataJson: { subscriptionId: 'sub-1' } };
    expect(resolveNotificationTarget('customer', byId)).toBe('/(customer)/subscription');
    expect(resolveNotificationTarget('merchant', byId)).toBe('/(merchant)/subscription');
    expect(resolveNotificationTarget('technician', byId)).toBe('/(technician)/subscription');

    const byTypeOnly = { type: 'subscription', dataJson: null };
    expect(resolveNotificationTarget('customer', byTypeOnly)).toBe('/(customer)/subscription');

    const submission = { type: 'subscription', dataJson: { submissionId: 'pay-1' } };
    expect(resolveNotificationTarget('merchant', submission)).toBe('/(merchant)/subscription');
  });

  it('routes verification decisions to the role profile', () => {
    expect(
      resolveNotificationTarget('customer', { type: 'verification', dataJson: null }),
    ).toBe('/(customer)/profile');
    expect(
      resolveNotificationTarget('technician', {
        type: 'verification',
        dataJson: { profileId: 'p-1', kind: 'technician', status: 'verified' },
      }),
    ).toBe('/(technician)/profile');
    expect(
      resolveNotificationTarget('merchant', {
        type: 'verification',
        dataJson: { profileId: 'p-2', kind: 'merchant', status: 'rejected' },
      }),
    ).toBe('/(merchant)/profile');
  });

  it('returns null for unknown payloads (tap only marks read)', () => {
    expect(resolveNotificationTarget('customer', { type: 'mystery', dataJson: null })).toBeNull();
    expect(
      resolveNotificationTarget('customer', { type: 'mystery', dataJson: { foo: 'bar' } }),
    ).toBeNull();
    // Empty-string ids are not destinations.
    expect(
      resolveNotificationTarget('customer', {
        type: 'request_status',
        dataJson: { serviceRequestId: '' },
      }),
    ).toBeNull();
  });

  it('never throws on malformed payloads', () => {
    expect(() =>
      resolveNotificationTarget('customer', { type: 'request_status', dataJson: { serviceRequestId: 42 } }),
    ).not.toThrow();
  });
});
