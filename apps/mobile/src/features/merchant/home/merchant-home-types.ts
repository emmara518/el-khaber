/**
 * Merchant Home — view-model and data-source contracts (M-A).
 *
 * Fields mirror docs/06_DATABASE.md §5 (business_name, verification)
 * and §21 (products.status → active/inactive counts) plus the
 * documented subscription context (docs/08 — presentation-only plan
 * name/status). No revenue, no orders, no commissions, no turnover.
 */

export type MerchantVerification = 'verified' | 'pending' | 'action_required';

export interface MerchantHomeProfile {
  readonly businessNameAr: string;
  readonly initialsAr: string;
  readonly cityAr: string;
  readonly verification: MerchantVerification;
  readonly verificationNoteAr: string;
}

export interface MerchantCatalogSummary {
  readonly totalProducts: number;
  readonly activeProducts: number;
  readonly inactiveProducts: number;
}

/** Presentation-only subscription context (docs/08). No prices. */
export interface MerchantSubscriptionSummary {
  readonly planNameAr: string;
  readonly statusAr: string;
}

export interface MerchantHomeViewModel {
  readonly profile: MerchantHomeProfile;
  readonly catalog: MerchantCatalogSummary;
  readonly subscription: MerchantSubscriptionSummary | null;
  readonly role: 'merchant';
}

export interface MerchantHomeDataSource {
  getHome(input: { role: 'merchant' }): Promise<MerchantHomeViewModel>;
}

/** Verification copy — icon + text, never color alone (unit-tested). */
export function merchantVerificationCopy(state: MerchantVerification): {
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

/** Catalog arithmetic guard — counts must always add up (unit-tested). */
export function isCatalogSummaryConsistent(summary: MerchantCatalogSummary): boolean {
  return (
    summary.activeProducts + summary.inactiveProducts === summary.totalProducts &&
    summary.totalProducts >= 0
  );
}
