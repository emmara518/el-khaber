/**
 * Single source of truth for technician service areas.
 *
 * The technician onboarding/profile stores the FULL labels below
 * (`technician_service_areas.label_ar`). Customer discovery filters with
 * SHORT district values that match those stored labels by containment
 * (the API's documented `area` semantics — docs/07_API.md §6), so the
 * filter vocabulary can never drift away from what a technician can
 * actually select.
 *
 * Do not add a filter value that does not match at least one canonical
 * label: `service-areas.spec.ts` enforces both directions.
 */

/** Exact labels a technician can select and the server stores. */
export const SERVICE_AREA_LABELS: ReadonlyArray<string> = [
  'القاهرة – مدينة نصر',
  'القاهرة – المعادي',
  'الجيزة – الدقي',
  'الإسكندرية – سموحة',
  'المنوفية – شبين الكوم',
];

export interface ServiceAreaFilterOption {
  /** Short customer-facing label. */
  readonly labelAr: string;
  /** Value sent as `area`; matched by label containment server-side. */
  readonly value: string;
}

/**
 * Customer filter vocabulary. Every value is a real substring of at least
 * one canonical label, so selecting it can return existing technicians.
 */
export const SERVICE_AREA_OPTIONS: ReadonlyArray<ServiceAreaFilterOption> = [
  { labelAr: 'مدينة نصر', value: 'مدينة نصر' },
  { labelAr: 'المعادي', value: 'المعادي' },
  { labelAr: 'الدقي', value: 'الدقي' },
  { labelAr: 'سموحة', value: 'سموحة' },
  { labelAr: 'شبين الكوم', value: 'شبين الكوم' },
];

/** Mirrors the server's case-insensitive label containment. */
export function serviceAreaMatches(labelAr: string, areaValue: string): boolean {
  const label = labelAr.trim().toLowerCase();
  const value = areaValue.trim().toLowerCase();
  return value.length > 0 && label.includes(value);
}

/** Every canonical label this filter value can match. */
export function serviceAreasForValue(areaValue: string): ReadonlyArray<string> {
  return SERVICE_AREA_LABELS.filter((label) => serviceAreaMatches(label, areaValue));
}
