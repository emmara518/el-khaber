/**
 * Notification event content (Task 10M).
 *
 * Single, central, server-side source for the Arabic product-safe copy of
 * every business event wired to the existing Notification persistence. No
 * database ids, UUIDs, Prisma errors, hostnames, or internal identifiers
 * are ever placed in user-facing content (docs/10 §24, Task 10M §9).
 *
 * Approved notification concepts — docs/02_PRODUCT.md §3.12:
 *   - Service request status changes
 *   - Technician contact/arrival updates
 *   - Subscription events
 *   - Important platform messages (admin operational — Task 10K)
 *
 * `type` stays within the constrained set already used by the system
 * (`request_status`, `subscription`); no new taxonomy is invented here.
 */

import type { NotificationContent } from './notifications.service';
import type { ServiceRequestStatusValue } from '@khabir/shared-validation';

/** Constrained notification `type` codes already used by the codebase. */
export const NOTIFICATION_TYPE = {
  requestStatus: 'request_status',
  subscription: 'subscription',
} as const;

const REQUEST_STATUS_COPY: Record<ServiceRequestStatusValue, { titleAr: string; bodyAr: string }> = {
  pending: { titleAr: 'طلب خدمة جديد', bodyAr: 'تم استلام طلب الخدمة وسيتم مراجعته.' },
  accepted: { titleAr: 'تم قبول طلب الخدمة', bodyAr: 'قبل الفني طلبك وسيتم التواصل معك قريبًا.' },
  on_the_way: { titleAr: 'الفني في الطريق', bodyAr: 'الفني في الطريق إليك الآن.' },
  in_progress: { titleAr: 'بدأ تنفيذ الخدمة', bodyAr: 'بدأ الفني العمل على طلبك.' },
  completed: { titleAr: 'تم إكمال الخدمة', bodyAr: 'تم إكمال طلبك. يمكنك تقييم الخدمة الآن.' },
  cancelled: { titleAr: 'تم إلغاء طلب الخدمة', bodyAr: 'تم إلغاء طلب الخدمة.' },
};

/** Content for a service-request status transition (docs/02 §3.12). */
export function requestStatusNotification(toStatus: ServiceRequestStatusValue): NotificationContent {
  const copy = REQUEST_STATUS_COPY[toStatus];
  return {
    type: NOTIFICATION_TYPE.requestStatus,
    titleAr: copy.titleAr,
    bodyAr: copy.bodyAr,
  };
}

/** Content for a subscription activation (admin manual grant, docs/08 §17). */
export function subscriptionActivatedNotification(): NotificationContent {
  return {
    type: NOTIFICATION_TYPE.subscription,
    titleAr: 'تم تفعيل اشتراكك',
    bodyAr: 'تم تفعيل الاشتراك الخاص بك بنجاح.',
  };
}

/** Content for cancellation-of-renewal (docs/08 §11, access until period end). */
export function subscriptionRenewalCancelledNotification(): NotificationContent {
  return {
    type: NOTIFICATION_TYPE.subscription,
    titleAr: 'تم إيقاف تجديد الاشتراك',
    bodyAr: 'تم إيقاف تجديد اشتراكك. يظل اشتراكك فعالًا حتى نهاية الفترة الحالية.',
  };
}

/** Content for a manual entitlement grant (docs/08 §17). */
export function entitlementGrantedNotification(nameAr: string): NotificationContent {
  return {
    type: NOTIFICATION_TYPE.subscription,
    titleAr: 'تم منحك ميزة جديدة',
    bodyAr: `تم منحك ميزة: ${nameAr}.`,
  };
}
