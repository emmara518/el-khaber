/**
 * Customer Profile — summary contracts (Batch A).
 *
 * Identity basics + service counters. Subscription is an ENTRY point
 * only in this phase (full logic belongs to a later phase per the
 * Phase-2 brief §16); the menu models it as a "coming soon" row so
 * no business behavior is implied.
 */

export interface CustomerProfileSummary {
  readonly displayNameAr: string;
  readonly initialsAr: string;
  readonly phoneAr: string;
  readonly cityAr: string;
  readonly districtAr: string;
  readonly memberSinceAr: string;
  readonly activeOrdersCount: number;
  readonly completedOrdersCount: number;
  readonly supportHoursAr: string;
}

export interface CustomerProfileDataSource {
  getProfile(input: { role: 'customer' }): Promise<CustomerProfileSummary>;
}
