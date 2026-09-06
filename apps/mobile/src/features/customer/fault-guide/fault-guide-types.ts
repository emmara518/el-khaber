/**
 * Customer Fault Guide — typed entities and data-source contract.
 *
 * Conservative by design: symptoms name what the customer observes,
 * causes use uncertain language ("قد يكون السبب…"), guidance lists
 * only basic safe checks, and every result ends with a recommended
 * action that escalates to a qualified technician when needed.
 * Nothing here is a certified diagnosis.
 *
 * Source: docs/03_USER_FLOWS.md §7, docs/04_UI_UX.md §16.
 */

import type { ApplianceSlug } from '../home/data/customer-home-types';

export interface FaultAppliance {
  readonly slug: ApplianceSlug;
  readonly titleAr: string;
  readonly taglineAr: string;
}

export interface FaultSymptom {
  readonly id: string;
  readonly applianceSlug: ApplianceSlug;
  readonly titleAr: string;
  /** Frequency hint shown on the symptom card (e.g. "شائع جدًا"). */
  readonly frequencyAr: string;
}

export interface FaultDetail {
  readonly symptomId: string;
  /** Possible causes — uncertain language only. */
  readonly possibleCausesAr: ReadonlyArray<string>;
  /** Basic safe checks — never destructive, never live-electrical. */
  readonly safeStepsAr: ReadonlyArray<string>;
  /** Extra warning for risky situations; null when not needed. */
  readonly warningAr: string | null;
  /** Recommended next action (always present). */
  readonly actionAr: string;
}

export interface FaultGuideData {
  readonly appliances: ReadonlyArray<FaultAppliance>;
  readonly symptoms: ReadonlyArray<FaultSymptom>;
  readonly details: ReadonlyArray<FaultDetail>;
}

export interface FaultGuideDataSource {
  getGuide(input: { role: 'customer' }): Promise<FaultGuideData>;
}

/** Symptoms scoped to one appliance (unit-tested). */
export function symptomsForAppliance(
  symptoms: ReadonlyArray<FaultSymptom>,
  slug: ApplianceSlug,
): ReadonlyArray<FaultSymptom> {
  return symptoms.filter((s) => s.applianceSlug === slug);
}

/** Detail lookup — null means NO_MATCH (unit-tested). */
export function detailForSymptom(
  details: ReadonlyArray<FaultDetail>,
  symptomId: string,
): FaultDetail | null {
  return details.find((d) => d.symptomId === symptomId) ?? null;
}
