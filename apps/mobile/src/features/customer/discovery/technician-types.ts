/**
 * Technician Discovery — typed entities, filters, and pure search
 * logic (Batch C).
 *
 * Deliberately small: no pricing, no ranking scores, no sponsored
 * placement. Filtering is deterministic (support/area/rating
 * thresholds) and the mock order is preserved — the product defines
 * no ranking metric, so none is invented.
 */

import type { FaultGuideData } from '../fault-guide/fault-guide-types';
import type { ApplianceSlug } from '../home/data/customer-home-types';

export interface TechnicianReview {
  readonly id: string;
  readonly authorAr: string;
  readonly rating: number;
  readonly textAr: string;
  readonly dateAr: string;
}

export interface Technician {
  readonly id: string;
  readonly nameAr: string;
  readonly initialsAr: string;
  /** Platform verification (identity + experience checked by الخبير team). Never implies government licensing. */
  readonly verified: boolean;
  readonly rating: number;
  readonly reviewCount: number;
  readonly experienceAr: string;
  readonly specialtiesAr: ReadonlyArray<string>;
  readonly appliances: ReadonlyArray<ApplianceSlug>;
  readonly servicesAr: ReadonlyArray<string>;
  readonly areasAr: ReadonlyArray<string>;
  readonly aboutAr: string;
  readonly available: boolean;
  readonly availabilityLabelAr: string;
  readonly reviews: ReadonlyArray<TechnicianReview>;
}

export interface TechnicianSearchFilters {
  readonly query: string;
  readonly appliance: ApplianceSlug | null;
  readonly specialty: string | null;
  readonly minRating: number | null;
  readonly area: string | null;
  readonly availableOnly: boolean;
}

export const EMPTY_TECHNICIAN_FILTERS: TechnicianSearchFilters = {
  query: '',
  appliance: null,
  specialty: null,
  minRating: null,
  area: null,
  availableOnly: false,
};

/** Fixed, product-supported filter vocabularies (no invented facets). */
export const ACTIVE_APPLIANCE_FILTERS: ReadonlyArray<{
  value: ApplianceSlug | null;
  labelAr: string;
}> = [
  { value: null, labelAr: 'الكل' },
  { value: 'washing_machine', labelAr: 'غسالات' },
  { value: 'refrigerator', labelAr: 'ثلاجات' },
  { value: 'air_conditioner', labelAr: 'تكييفات' },
];

export const SPECIALTY_OPTIONS: ReadonlyArray<string> = [
  'تبريد وتكييف',
  'غسالات أوتوماتيك',
  'ثلاجات وفريزرات',
];

export const RATING_OPTIONS: ReadonlyArray<{ value: number | null; labelAr: string }> = [
  { value: null, labelAr: 'الكل' },
  { value: 4.5, labelAr: '4.5 فأعلى' },
  { value: 4.8, labelAr: '4.8 فأعلى' },
];

export const AREA_OPTIONS: ReadonlyArray<string> = [
  'النزهة',
  'الملز',
  'العليا',
  'الشفا',
  'جدة – الروضة',
];

/** Deterministic mock filtering — every predicate is a simple match. */
export function applyTechnicianFilters(
  technicians: ReadonlyArray<Technician>,
  filters: TechnicianSearchFilters,
): ReadonlyArray<Technician> {
  const q = filters.query.trim();
  return technicians.filter((t) => {
    if (filters.appliance !== null && !t.appliances.includes(filters.appliance)) return false;
    if (filters.specialty !== null && !t.specialtiesAr.includes(filters.specialty)) return false;
    if (filters.minRating !== null && t.rating < filters.minRating) return false;
    if (filters.area !== null && !t.areasAr.includes(filters.area)) return false;
    if (filters.availableOnly && !t.available) return false;
    if (q.length > 0) {
      const haystack = [t.nameAr, ...t.specialtiesAr, ...t.servicesAr].join(' ');
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Number of active (non-default) filters — drives the filter badge. */
export function activeFilterCount(filters: TechnicianSearchFilters): number {
  let count = 0;
  if (filters.query.trim().length > 0) count += 1;
  if (filters.appliance !== null) count += 1;
  if (filters.specialty !== null) count += 1;
  if (filters.minRating !== null) count += 1;
  if (filters.area !== null) count += 1;
  if (filters.availableOnly) count += 1;
  return count;
}

export interface SearchContext {
  readonly symptomId: string;
  readonly applianceSlug: ApplianceSlug;
  readonly applianceTitleAr: string;
  readonly symptomTitleAr: string;
}

/**
 * Resolve `?symptomId=` through the existing Fault Guide contract.
 * Null = general search (no invented symptom).
 */
export function resolveSearchContext(
  guide: FaultGuideData,
  symptomId: string | null,
): SearchContext | null {
  if (symptomId === null || symptomId.length === 0) return null;
  const symptom = guide.symptoms.find((s) => s.id === symptomId);
  if (!symptom) return null;
  const applianceTitle =
    guide.appliances.find((a) => a.slug === symptom.applianceSlug)?.titleAr ?? '';
  return {
    symptomId,
    applianceSlug: symptom.applianceSlug,
    applianceTitleAr: applianceTitle,
    symptomTitleAr: symptom.titleAr,
  };
}

export function findTechnician(
  technicians: ReadonlyArray<Technician>,
  id: string,
): Technician | null {
  return technicians.find((t) => t.id === id) ?? null;
}

/**
 * Typed Batch-D handoff contract. The destination screen is owned
 * by Batch D; this builder keeps the params honest and testable.
 */
export function buildServiceRequestHandoff(input: {
  technicianId: string;
  applianceSlug?: ApplianceSlug;
  symptomId?: string;
}): {
  pathname: '/(customer)/request-service';
  params: { technicianId: string; appliance?: ApplianceSlug; symptomId?: string };
} {
  return {
    pathname: '/(customer)/request-service',
    params: {
      technicianId: input.technicianId,
      ...(input.applianceSlug !== undefined ? { appliance: input.applianceSlug } : {}),
      ...(input.symptomId !== undefined && input.symptomId.length > 0
        ? { symptomId: input.symptomId }
        : {}),
    },
  };
}
