/**
 * Customer Maintenance entry — view-model and data-source contracts.
 *
 * Batch A scope: the ENTRY experience (appliance picker + how-it-works
 * + popular symptom teasers). The full drill-down (cause → safe
 * guidance → find technician) is Batch B and will extend — not
 * replace — these contracts.
 *
 * Copy rule: teasers name symptoms only and never state diagnoses or
 * safety instructions; those belong to the managed Batch-B content.
 */

import type { ApplianceSlug } from '../home/data/customer-home-types';

export interface MaintenanceAppliance {
  readonly slug: ApplianceSlug;
  readonly titleAr: string;
  readonly icon: string;
  readonly techniciansAr: string;
  readonly issueCount: number;
}

export interface MaintenanceIssueTeaser {
  readonly id: string;
  readonly applianceSlug: ApplianceSlug;
  readonly titleAr: string;
  readonly reportsAr: string;
}

export interface MaintenanceEntryViewModel {
  readonly appliances: ReadonlyArray<MaintenanceAppliance>;
  readonly stepsAr: ReadonlyArray<string>;
  readonly popularIssues: ReadonlyArray<MaintenanceIssueTeaser>;
}

export interface MaintenanceEntryDataSource {
  getEntry(input: { role: 'customer' }): Promise<MaintenanceEntryViewModel>;
}

/** Pure helper — issues for the selected appliance (unit-tested). */
export function issuesForAppliance(
  issues: ReadonlyArray<MaintenanceIssueTeaser>,
  slug: ApplianceSlug,
): ReadonlyArray<MaintenanceIssueTeaser> {
  return issues.filter((i) => i.applianceSlug === slug);
}
