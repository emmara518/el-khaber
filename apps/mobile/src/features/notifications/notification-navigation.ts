/**
 * Notification deep-link resolution (WP-Notifications).
 *
 * The backend is authoritative: every business notification carries a
 * navigation `dataJson` with ids only (never PII). This module maps that
 * payload to the role's expo-router destination. Unknown / absent payloads
 * resolve to `null` (the tap only marks the notification read).
 *
 * - serviceRequestId → customer: `/(customer)/requests/:id`,
 *   technician: `/(technician)/orders/:id`, merchant: none.
 * - subscriptionId / submissionId (type `subscription`) →
 *   customer: `/(customer)/subscription`, merchant: `/(merchant)/subscription`,
 *   technician: `/(technician)/subscription`.
 * - verification type / profileId → the role's profile screen.
 */

import type { NotificationsRole } from './notifications-data-source';

function asId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function profileRouteFor(role: NotificationsRole): string {
  if (role === 'technician') return '/(technician)/profile';
  if (role === 'merchant') return '/(merchant)/profile';
  return '/(customer)/profile';
}

/**
 * Resolves the expo-router destination for a notification, or `null`
 * when the payload carries no known destination. Never throws.
 */
export function resolveNotificationTarget(
  role: NotificationsRole,
  input: { type: string; dataJson: Record<string, unknown> | null },
): string | null {
  const data = input.dataJson ?? {};

  const serviceRequestId = asId(data['serviceRequestId']);
  if (serviceRequestId !== null) {
    if (role === 'customer') return `/(customer)/requests/${serviceRequestId}`;
    if (role === 'technician') return `/(technician)/orders/${serviceRequestId}`;
    return null;
  }

  if (
    asId(data['subscriptionId']) !== null ||
    asId(data['submissionId']) !== null ||
    asId(data['entitlementId']) !== null ||
    input.type === 'subscription'
  ) {
    if (role === 'customer') return '/(customer)/subscription';
    if (role === 'merchant') return '/(merchant)/subscription';
    return '/(technician)/subscription';
  }

  if (input.type === 'verification' || asId(data['profileId']) !== null) {
    return profileRouteFor(role);
  }

  return null;
}
