/**
 * Technician Home — view-model and data-source contracts (T-A).
 *
 * Operational, not analytical: identity, verification, today's
 * counts, incoming-request preview (presentation only — accept /
 * reject belong to T-C), active-service preview (no controls —
 * T-D), and the rating summary from the existing data model.
 * No earnings, no rates, no percentages anywhere.
 */

export type TechnicianVerification = 'verified' | 'pending' | 'action_required';

export interface TechnicianHomeProfile {
  readonly nameAr: string;
  readonly initialsAr: string;
  readonly specialtyAr: string;
  readonly areasAr: ReadonlyArray<string>;
  readonly rating: number;
  readonly reviewCount: number;
  readonly verification: TechnicianVerification;
  readonly verificationNoteAr: string;
  readonly availabilityLabelAr: string;
  /** True when the technician's availability status is "available". */
  readonly available: boolean;
}

export interface TechnicianTodayOverview {
  readonly newRequests: number;
  readonly inProgress: number;
  readonly completedToday: number;
}

export interface TechnicianIncomingPreview {
  readonly id: string;
  readonly customerNameAr: string;
  readonly applianceAr: string;
  readonly problemAr: string;
  readonly timeAr: string;
}

export interface TechnicianActiveService {
  readonly id: string;
  readonly customerNameAr: string;
  readonly applianceAr: string;
  readonly taskAr: string;
  readonly statusLabelAr: string;
  readonly startedAr: string;
}

export interface TechnicianHomeViewModel {
  readonly profile: TechnicianHomeProfile;
  readonly today: TechnicianTodayOverview;
  readonly incoming: ReadonlyArray<TechnicianIncomingPreview>;
  /** Null = no active service (explicit empty state, not an error). */
  readonly active: TechnicianActiveService | null;
  readonly role: 'technician';
}

export interface TechnicianHomeDataSource {
  getHome(input: { role: 'technician' }): Promise<TechnicianHomeViewModel>;
}

/** Verification copy — icon + text, never color alone (unit-tested). */
export function verificationCopy(state: TechnicianVerification): {
  icon: 'check-circle' | 'clock' | 'alert-circle';
  titleAr: string;
} {
  switch (state) {
    case 'verified':
      return { icon: 'check-circle', titleAr: 'تم التحقق' };
    case 'pending':
      return { icon: 'clock', titleAr: 'قيد المراجعة' };
    case 'action_required':
      return { icon: 'alert-circle', titleAr: 'يحتاج إجراء' };
  }
}
