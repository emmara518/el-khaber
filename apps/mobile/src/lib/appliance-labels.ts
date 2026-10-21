/**
 * Canonical Arabic display labels for the approved appliance categories.
 *
 * Phase 15 / CTO correction: ALL categories present in the approved catalog
 * are in scope (not a 3-device subset). This is the single source of truth
 * for the Arabic label of an `ApplianceSlug`; screens must not re-declare a
 * competing map. The slugs mirror the backend `appliance-categories` catalog.
 */

import type { ApplianceSlug } from '../features/customer/home/data/customer-home-types';

export const APPLIANCE_LABELS: Record<ApplianceSlug, string> = {
  washing_machine: 'غسالات',
  refrigerator: 'ثلاجات',
  air_conditioner: 'تكييفات',
  dishwasher: 'غسالات الأطباق',
  coffee_machine: 'ماكينات القهوة',
  microwave: 'ميكروويف',
  oven: 'أفران',
  tv_screen: 'شاشات',
  vacuum_cleaner: 'مكانس كهربائية',
  water_heater: 'سخانات المياه',
};

/**
 * Canonical display order for the approved appliance catalog. Screens that
 * offer appliance selection consume this instead of re-declaring a subset;
 * the order matches the Home appliance grid and the fault guide.
 */
export const APPLIANCE_ORDER: ReadonlyArray<ApplianceSlug> = [
  'washing_machine',
  'refrigerator',
  'air_conditioner',
  'dishwasher',
  'coffee_machine',
  'microwave',
  'oven',
  'tv_screen',
  'vacuum_cleaner',
  'water_heater',
];

/** Arabic label for an appliance slug. */
export function applianceLabelAr(slug: ApplianceSlug): string {
  return APPLIANCE_LABELS[slug];
}
