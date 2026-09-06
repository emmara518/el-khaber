/**
 * Service Request — draft model, steps, validation, and summary
 * builders (Batch D). Pure module: no React, fully unit-tested.
 *
 * Product rules encoded here:
 * - appliance required; changing it clears dependent problem picks,
 * - problem required (predefined option, or custom text when "other"),
 * - description optional (500-char interface cap with counter),
 * - photos optional (typed abstraction, 5-item interface cap),
 * - location required (mock saved locations),
 * - appointment optional ("coordinate by phone" is a valid choice),
 * - review → submit; exit never submits.
 */

import type { ApplianceSlug } from '../home/data/customer-home-types';

export const SERVICE_REQUEST_STEPS = [
  'appliance',
  'problem',
  'description',
  'photos',
  'location',
  'appointment',
  'review',
] as const;

export type ServiceRequestStep = (typeof SERVICE_REQUEST_STEPS)[number];

export const STEP_INDEX: Record<ServiceRequestStep, number> = {
  appliance: 0,
  problem: 1,
  description: 2,
  photos: 3,
  location: 4,
  appointment: 5,
  review: 6,
};

export interface RequestAttachment {
  readonly id: string;
  readonly labelAr: string;
}

export interface RequestLocation {
  readonly id: string;
  readonly labelAr: string;
  readonly detailAr: string;
  readonly isDefault: boolean;
}

export interface AppointmentSlot {
  readonly id: string;
  readonly dayAr: string;
  readonly timeAr: string;
  readonly available: boolean;
}

export interface ProblemOption {
  readonly id: string;
  /** Null = shown for every appliance (general problems). */
  readonly applianceSlug: ApplianceSlug | null;
  readonly titleAr: string;
}

export const OTHER_PROBLEM_ID = 'other';

export interface ServiceRequestDraft {
  readonly technicianId: string;
  readonly appliance: ApplianceSlug | null;
  /** Fault-guide symptom context (prefill only; editable via problem). */
  readonly symptomId: string | null;
  readonly problemId: string | null;
  readonly customProblemAr: string;
  readonly descriptionAr: string;
  readonly photos: ReadonlyArray<RequestAttachment>;
  readonly locationId: string | null;
  /** Null = coordinate by phone (valid choice, not an error). */
  readonly appointmentSlotId: string | null;
}

export const EMPTY_DRAFT: ServiceRequestDraft = {
  technicianId: '',
  appliance: null,
  symptomId: null,
  problemId: null,
  customProblemAr: '',
  descriptionAr: '',
  photos: [],
  locationId: null,
  appointmentSlotId: null,
};

export const DESCRIPTION_MAX = 500;
export const PHOTOS_MAX = 5;

/** Handoff params consumed from the Batch-C contract (unchanged). */
export interface ServiceRequestHandoff {
  readonly technicianId: string;
  readonly appliance?: ApplianceSlug;
  readonly symptomId?: string;
}

export function isApplianceSlug(value: unknown): value is ApplianceSlug {
  return value === 'washing_machine' || value === 'refrigerator' || value === 'air_conditioner';
}

/** Initialize the draft from the handoff — never invents values. */
export function initDraftFromHandoff(handoff: ServiceRequestHandoff): ServiceRequestDraft {
  return {
    ...EMPTY_DRAFT,
    technicianId: handoff.technicianId,
    appliance: handoff.appliance !== undefined && isApplianceSlug(handoff.appliance) ? handoff.appliance : null,
    symptomId:
      handoff.symptomId !== undefined && handoff.symptomId.length > 0 ? handoff.symptomId : null,
  };
}

/** Step validation — Arabic message or null when valid. */
export function validateStep(
  draft: ServiceRequestDraft,
  step: ServiceRequestStep,
): string | null {
  switch (step) {
    case 'appliance':
      return draft.appliance === null ? 'اختر الجهاز أولًا للمتابعة' : null;
    case 'problem':
      if (draft.problemId === null) return 'حدد المشكلة أو اختر مشكلة أخرى مع الوصف';
      if (draft.problemId === OTHER_PROBLEM_ID && draft.customProblemAr.trim().length < 5) {
        return 'صف المشكلة باختصار (٥ أحرف على الأقل)';
      }
      return null;
    case 'description':
      return draft.descriptionAr.length > DESCRIPTION_MAX
        ? `الوصف يجب ألا يتجاوز ${DESCRIPTION_MAX} حرف`
        : null;
    case 'photos':
      return draft.photos.length > PHOTOS_MAX ? `الحد الأقصى ${PHOTOS_MAX} صور` : null;
    case 'location':
      return draft.locationId === null ? 'اختر موقع تقديم الخدمة' : null;
    case 'appointment':
      return null;
    case 'review':
      for (const s of ['appliance', 'problem', 'location'] as const) {
        const err = validateStep(draft, s);
        if (err !== null) return err;
      }
      return null;
  }
}

/** Problems relevant to an appliance (unit-tested). */
export function problemsForAppliance(
  problems: ReadonlyArray<ProblemOption>,
  appliance: ApplianceSlug | null,
): ReadonlyArray<ProblemOption> {
  if (appliance === null) return [];
  return problems.filter((p) => p.applianceSlug === null || p.applianceSlug === appliance);
}

export interface ResolvedSummary {
  readonly applianceTitleAr: string;
  readonly problemTitleAr: string;
}

export function nextPhotoLabel(count: number): string {
  return `صورة ${count + 1}`;
}

/** Whether the draft holds anything worth keeping (exit UX). */
export function draftHasContent(draft: ServiceRequestDraft): boolean {
  return (
    draft.problemId !== null ||
    draft.customProblemAr.trim().length > 0 ||
    draft.descriptionAr.trim().length > 0 ||
    draft.photos.length > 0 ||
    draft.locationId !== null ||
    draft.appointmentSlotId !== null
  );
}
