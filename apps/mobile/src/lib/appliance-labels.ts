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

/** Arabic label for an appliance slug. */
export function applianceLabelAr(slug: ApplianceSlug): string {
  return APPLIANCE_LABELS[slug];
}
