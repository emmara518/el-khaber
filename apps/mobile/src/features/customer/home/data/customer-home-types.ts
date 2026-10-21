/**
 * Customer Home — view-model and data-source contracts.
 *
 * The Home screen renders a `CustomerHomeViewModel`. The data is
 * fetched by a `CustomerHomeDataSource` (real API adapter).
 *
 * Source: Task #003 spec; docs/01_PROJECT.md §4.1; docs/02_PRODUCT.md
 * §3.4; docs/03_USER_FLOWS.md §6.
 */

import type { Role } from '@khabir/shared-types';

/** Arabic display name for a primary appliance category (server-owned slugs). */
export type ApplianceSlug =
  | 'air_conditioner'
  | 'refrigerator'
  | 'washing_machine'
  | 'dishwasher'
  | 'coffee_machine'
  | 'microwave'
  | 'oven'
  | 'tv_screen'
  | 'vacuum_cleaner'
  | 'water_heater';

export interface ApplianceCardItem {
  readonly slug: ApplianceSlug;
  readonly titleAr: string;
  /**
   * Real per-appliance technician total. `null` means the server total
   * could not be read (unknown) — the card must not assert a false zero.
   */
  readonly availableTechnicians: number | null;
  /** Short warranty / availability line shown below the count. */
  readonly captionAr: string;
  /** Optional technician-availability line shown on the card. */
  readonly techniciansAr: string;
  /** Stable color key from the design tokens (e.g. "brand.navy"). */
  readonly accent: 'navy' | 'gold' | 'soft';
}

/**
 * Arabic availability line for an appliance card. Returns `null` when the
 * count is unknown so the caller omits the line rather than presenting an
 * unverified "no technicians" claim (ISSUE-008 / TASK-040).
 */
export function availabilityLineAr(
  availableTechnicians: number | null,
  techniciansAr: string,
): string | null {
  if (availableTechnicians === null) return null;
  if (availableTechnicians <= 0) return 'لا يوجد فنيون';
  return `${String(availableTechnicians)} ${techniciansAr}`;
}

export interface QuickServiceItem {
  readonly id: string;
  readonly titleAr: string;
  /** Icon glyph used in the reference design (simple letterform). */
  readonly icon: 'wrench' | 'search' | 'clipboard' | 'package';
  /** Customer-group route the tile opens. */
  readonly route: 'maintenance' | 'find-technician' | 'requests';
}

export type OrderStatus = 'in_progress' | 'scheduled' | 'completed';

export interface CurrentOrderItem {
  readonly id: string;
  readonly applianceAr: string;
  readonly brandAndModel: string;
  readonly modelCode: string;
  readonly status: OrderStatus;
  readonly statusLabelAr: string;
  readonly taskAr: string;
  readonly technicianName: string;
  readonly scheduledAtIso: string;
}

export interface TechnicianCardItem {
  readonly id: string;
  readonly nameAr: string;
  readonly initialsAr: string;
  readonly rating: number;
  readonly reviewCount: number;
  readonly specialtyAr: string;
  /** Platform verification (identity + experience checked by الخبير). */
  readonly verified: boolean;
  /** Real server availability status, already localized. */
  readonly availabilityAr: string;
}

export interface CustomerContext {
  readonly displayNameAr: string;
  readonly avatarInitialsAr: string;
  readonly cityAr: string;
  readonly districtAr: string;
}

export interface CustomerHomeViewModel {
  readonly context: CustomerContext;
  readonly greeting: {
    readonly line1Ar: string;
    readonly line2Ar: string;
  };
  readonly appliances: ReadonlyArray<ApplianceCardItem>;
  readonly quickServices: ReadonlyArray<QuickServiceItem>;
  readonly guarantee: {
    readonly titleAr: string;
    readonly descriptionAr: string;
    readonly ctaAr: string;
  };
  readonly currentOrders: ReadonlyArray<CurrentOrderItem>;
  readonly recommendedTechnicians: ReadonlyArray<TechnicianCardItem>;
  /** Customer role from the authenticated session. The presenter does
   * not branch on the value today; the field is here so future
   * server-driven personalization is wired. */
  readonly role: Extract<Role, 'customer'>;
}

export interface CustomerHomeDataSource {
  getHome(input: { role: 'customer' }): Promise<CustomerHomeViewModel>;
}
