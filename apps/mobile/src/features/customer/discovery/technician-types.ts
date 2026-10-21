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
  /** Server-issued public avatar URL (null when the technician has none). */
  readonly avatarUrl: string | null;
  readonly available: boolean;
  readonly availabilityLabelAr: string;
  readonly reviews: ReadonlyArray<TechnicianReview>;
}

export interface TechnicianSearchFilters {
  readonly query: string;
  readonly appliance: ApplianceSlug | null;
  readonly specialty: string | null;
  /**
   * WP-Discovery: catalog service UUID selected alongside `specialty`
   * (the display name). Sent as `service_id`; null = no service filter.
   */
  readonly serviceId: string | null;
  readonly minRating: number | null;
  readonly area: string | null;
  readonly availableOnly: boolean;
}

export const EMPTY_TECHNICIAN_FILTERS: TechnicianSearchFilters = {
  query: '',
  appliance: null,
  specialty: null,
  serviceId: null,
  minRating: null,
  area: null,
  availableOnly: false,
};

/**
 * Server list query (WP-Discovery): every supported GET /technicians
 * filter. The data-source sends all of them; nothing is re-filtered
 * client-side afterwards.
 */
export interface TechnicianListQuery {
  readonly q?: string;
  readonly applianceCategoryId?: string;
  readonly serviceId?: string;
  readonly faultId?: string;
  readonly ratingMin?: number;
  readonly area?: string;
  readonly availability?: 'available';
}

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
  'مدينة نصر',
  'المعادي',
  'مصر الجديدة',
  'حلوان',
  'الإسكندرية – سموحة',
];

/**
 * Deterministic mock filtering — every predicate is a simple match.
 *
 * NOTE (WP-Discovery): production search is server-side
 * (`buildTechnicianListQuery` → GET /technicians); this helper is kept
 * for fixture/spec parity only and is NOT applied to API results.
 */
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
    // WP-4: availability is filtered SERVER-SIDE (the discovery request
    // sends `availability`); it is intentionally NOT re-filtered here.
    if (q.length > 0) {
      const haystack = [t.nameAr, ...t.specialtiesAr, ...t.servicesAr].join(' ');
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/**
 * UUID-shape check (WP-Discovery): fault-guide symptom ids are real
 * Fault UUIDs in production but synthetic slugs in fixtures — only
 * UUID-shaped values may be sent as `fault_id`.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Server query for GET /technicians from UI filters + resolved catalog
 * ids (WP-Discovery). Every criterion the backend supports is sent;
 * nothing is filtered client-side afterwards. Empty/unknown values are
 * omitted (never sent as empty strings).
 */
export function buildTechnicianListQuery(input: {
  query: string;
  applianceCategoryId: string | null;
  serviceId: string | null;
  faultId: string | null;
  minRating: number | null;
  area: string | null;
  availableOnly: boolean;
}): TechnicianListQuery {
  const q = input.query.trim();
  return {
    ...(q.length > 0 ? { q } : {}),
    ...(input.applianceCategoryId !== null
      ? { applianceCategoryId: input.applianceCategoryId }
      : {}),
    ...(input.serviceId !== null ? { serviceId: input.serviceId } : {}),
    ...(input.faultId !== null && isUuid(input.faultId) ? { faultId: input.faultId } : {}),
    ...(input.minRating !== null ? { ratingMin: input.minRating } : {}),
    ...(input.area !== null && input.area.trim().length > 0 ? { area: input.area.trim() } : {}),
    ...(input.availableOnly ? { availability: 'available' as const } : {}),
  };
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
  /**
   * WP-Discovery: the fault UUID behind the symptom when the id is
   * UUID-shaped (production guide data); null for synthetic fixture
   * ids — never sent as `fault_id` then.
   */
  readonly faultId: string | null;
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
    faultId: isUuid(symptomId) ? symptomId : null,
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
