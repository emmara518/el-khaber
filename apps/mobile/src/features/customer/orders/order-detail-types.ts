/**
 * Order tracking — lifecycle presentation contracts (Batch E).
 *
 * The ONLY states are the documented ones (docs/07_API.md §22,
 * docs/06_DATABASE.md §11 timestamps, docs/04_UI_UX.md §20):
 * pending → accepted → on_the_way → in_progress → completed
 * (+ cancelled as a terminal branch). Reuses `CustomerRequestStatus`
 * from the Batch-A requests module — no parallel enum.
 */

import type { CustomerRequestStatus } from '../requests/customer-requests-types';

export type TrackingStepState = 'done' | 'current' | 'upcoming';

export interface TimelineStep {
  readonly status: Exclude<CustomerRequestStatus, 'cancelled'>;
  readonly titleAr: string;
  readonly explanationAr: string;
  /** Set only when fixture data exists — never invented. */
  readonly atAr: string | null;
  readonly state: TrackingStepState;
}

export interface OrderDetail {
  readonly requestId: string;
  readonly technicianId: string | null;
  readonly technicianNameAr: string;
  readonly technicianInitialsAr: string;
  readonly applianceAr: string;
  readonly taskAr: string;
  readonly status: CustomerRequestStatus;
  readonly statusLabelAr: string;
  readonly locationAr: string;
  readonly appointmentAr: string | null;
  readonly timeline: ReadonlyArray<TimelineStep>;
}

export interface OrderDataSource {
  getOrderDetail(input: { role: 'customer'; requestId: string }): Promise<OrderDetail | null>;
}

const LIFECYCLE: ReadonlyArray<{
  status: Exclude<CustomerRequestStatus, 'cancelled'>;
  titleAr: string;
  explanationAr: string;
}> = [
  { status: 'pending', titleAr: 'تم الطلب', explanationAr: 'استلمنا طلبك وهو بانتظار تعيين فني' },
  { status: 'accepted', titleAr: 'تم قبول الطلب', explanationAr: 'وافق الفني على تنفيذ طلبك' },
  { status: 'on_the_way', titleAr: 'الفني في الطريق', explanationAr: 'الفني في طريقه إلى موقعك الآن' },
  { status: 'in_progress', titleAr: 'قيد التنفيذ', explanationAr: 'العمل جارٍ على جهازك حاليًا' },
  { status: 'completed', titleAr: 'تم الإنجاز', explanationAr: 'اكتملت الخدمة بنجاح' },
];

/**
 * Build the timeline for a status. Steps before the current index
 * are done, the matching step is current, later steps upcoming.
 * `timestamps` maps statuses to fixture times (absent = null, never
 * invented). Cancelled orders show reached steps as done with no
 * current step.
 */
export function buildTimeline(
  status: CustomerRequestStatus,
  timestamps: Partial<Record<Exclude<CustomerRequestStatus, 'cancelled'>, string>>,
): ReadonlyArray<TimelineStep> {
  if (status === 'cancelled') {
    return LIFECYCLE.map((step) => ({
      ...step,
      atAr: timestamps[step.status] ?? null,
      state: (timestamps[step.status] !== undefined ? 'done' : 'upcoming') as TrackingStepState,
    }));
  }
  if (status === 'completed') {
    // Terminal success: every stage is done, none is "in progress".
    return LIFECYCLE.map((step) => ({
      ...step,
      atAr: timestamps[step.status] ?? null,
      state: 'done' as TrackingStepState,
    }));
  }
  const currentIndex = LIFECYCLE.findIndex((s) => s.status === status);
  return LIFECYCLE.map((step, index) => ({
    ...step,
    atAr: timestamps[step.status] ?? null,
    state: (index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming') as TrackingStepState,
  }));
}

/** The next expected step title (null when terminal). */
export function nextStepTitle(status: CustomerRequestStatus): string | null {
  if (status === 'completed' || status === 'cancelled') return null;
  const next = LIFECYCLE[LIFECYCLE.findIndex((s) => s.status === status) + 1];
  return next ? `الخطوة التالية: ${next.titleAr}` : null;
}
