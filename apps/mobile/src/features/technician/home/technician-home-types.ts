/**
 * Technician Home — view-model and data-source contracts (T-A).
 *
 * Operational, not analytical: identity, verification, today's
 * counts, incoming-request preview (presentation only — accept /
 * reject belong to T-C), active-service preview (no controls —
 * T-D), and the rating summary from the existing data model.
 * No earnings, no rates, no percentages anywhere.
 *
 * `applianceSlug` is the canonical category slug used to render the
 * approved appliance asset on Home cards.
 */

import type { TechnicianAvailabilityStatus } from '../../../lib/technician-status';
import type { ServiceRequestStatus } from '@khabir/shared-types';

/** WP-4 availability states — canonical server union (single source). */
export type { TechnicianAvailabilityStatus } from '../../../lib/technician-status';
/** WP-4 approved labels — single source shared with customer discovery. */
export { availabilityLabelAr } from '../../../lib/technician-status';

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
  readonly onTheWay: number;
  readonly completedToday: number;
}

export interface TechnicianIncomingPreview {
  readonly id: string;
  readonly customerNameAr: string;
  readonly applianceAr: string;
  /** Canonical category slug — drives the approved appliance asset. */
  readonly applianceSlug: string | null;
  readonly problemAr: string;
  readonly timeAr: string;
}

export interface TechnicianActiveService {
  readonly id: string;
  readonly customerNameAr: string;
  readonly applianceAr: string;
  /** Canonical category slug — drives the approved appliance asset. */
  readonly applianceSlug: string | null;
  readonly taskAr: string;
  /** Real lifecycle status (accepted | on_the_way | in_progress). */
  readonly status: ServiceRequestStatus;
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

/**
 * Resolve the screen state without letting a null data payload mask an
 * error. The original screen checked `data === null` before the error
 * branch, so an API failure rendered the loading state forever.
 */
export function technicianHomeViewState(
  status: 'loading' | 'loaded' | 'error',
  data: TechnicianHomeViewModel | null,
): 'loading' | 'error' | 'loaded' {
  if (status === 'error') return 'error';
  if (status === 'loading') return 'loading';
  return data === null ? 'error' : 'loaded';
}

/**
 * A technician still needs the onboarding journey when verification is not
 * complete and the profile lacks either a specialty service or a service
 * area. Verified technicians are never pushed back into onboarding here.
 */
export function needsTechnicianOnboarding(
  profile: Pick<TechnicianHomeProfile, 'verification' | 'specialtyAr' | 'areasAr'>,
): boolean {
  return (
    profile.verification !== 'verified' &&
    (profile.specialtyAr.trim().length === 0 || profile.areasAr.length === 0)
  );
}

export interface TechnicianHomeDataSource {
  getHome(input: { role: 'technician' }): Promise<TechnicianHomeViewModel>;
  /** WP-4: technician-controlled availability (available | unavailable only). */
  setAvailability(input: {
    role: 'technician';
    available: boolean;
  }): Promise<{ availabilityStatus: TechnicianAvailabilityStatus }>;
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
