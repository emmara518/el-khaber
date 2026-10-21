/**
 * Real API `TechnicianDataSource` (Task 10J, WP-Discovery) — technician
 * discovery.
 *
 * Endpoints (docs/07 §6, PUBLIC, verified-only visibility):
 * - GET /technicians — ALL supported filters sent server-side:
 *   q / appliance_category_id / service_id / fault_id / rating_min /
 *   availability / area (label containment, NOT geo) / sort=rating,
 *   paginated (server max 100),
 * - GET /technicians/:id — direct detail read (the profile screen no
 *   longer depends on the list window),
 * - GET /technicians/:id/reviews — public reviews (no customer
 *   identifiers by contract).
 *
 * The server is the source of truth: results are rendered as returned
 * (bounded drain for counters only) — no client-side re-filtering that
 * could hide valid matches outside a page window.
 *
 * Normalization (docs/07 §26 TechnicianPublicDto):
 * - `displayName` is nullable → generic verified-technician fallback,
 * - `areasAr` are the public service-area labels (no coordinates),
 * - reviews are hydrated for the first bounded slice of results;
 *   late pages render the existing empty-reviews state.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDate } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { categorySlugById } from '../../../lib/catalog-reference';
import { initialsOf } from '../../../lib/request-labels';
import { availabilityLabelAr, isAvailable } from '../../../lib/technician-status';
import { isApplianceSlug } from '../service-request/service-request-types';

import type { TechnicianDataSource as TechnicianDataSourceContract } from './mock-technician-data-source';
import type { Technician, TechnicianListQuery, TechnicianReview } from './technician-types';
import type { ApplianceSlug } from '../home/data/customer-home-types';
import type { ReviewSummaryDto, TechnicianPublicDto } from '@khabir/shared-types';

/** Review hydration cap — first rendered slice only (bounded N+1). */
const REVIEW_HYDRATION_LIMIT = 10;
/** Reviews page window per technician (public reviews are bounded). */
const REVIEWS_PAGE_LIMIT = 20;

/** Availability enum → the shared Arabic label + available flag (single source). */
export function availabilityForDto(status: TechnicianPublicDto['availabilityStatus']): {
  available: boolean;
  labelAr: string;
} {
  return { available: isAvailable(status), labelAr: availabilityLabelAr(status) };
}

/** Map review tags/labels + comment to the existing review card model. */
export function mapReviewItem(dto: ReviewSummaryDto): TechnicianReview {
  return {
    id: dto.id,
    // Privacy by contract: no customer identifiers are exposed.
    authorAr: 'عميل',
    rating: dto.rating,
    textAr: dto.comment ?? '',
    dateAr: formatArDate(dto.createdAt),
  };
}

/** TechnicianPublicDto (+ optional reviews) → the existing Technician model. */
export async function mapTechnicianCard(
  dto: TechnicianPublicDto,
  reviews: ReadonlyArray<TechnicianReview> = [],
): Promise<Technician> {
  const name = dto.displayName ?? 'فني معتمد';
  const specialtiesAr: string[] = [];
  const servicesAr: string[] = [];
  const applianceSet = new Set<ApplianceSlug>();
  for (const entry of dto.services) {
    servicesAr.push(entry.service.nameAr);
    if (!specialtiesAr.includes(entry.service.nameAr)) specialtiesAr.push(entry.service.nameAr);
    const slug = await categorySlugById(entry.service.applianceCategoryId);
    // All approved catalog appliance categories are in scope (CTO correction).
    if (isApplianceSlug(slug)) {
      applianceSet.add(slug);
    }
  }
  const availability = availabilityForDto(dto.availabilityStatus);
  return {
    id: dto.id,
    nameAr: name,
    initialsAr: initialsOf(name),
    // Public discovery lists ONLY verified technicians by contract.
    verified: dto.verificationStatus === 'verified',
    rating: dto.ratingAverage ?? 0,
    reviewCount: dto.ratingCount,
    experienceAr: dto.experienceYears > 0 ? `خبرة ${String(dto.experienceYears)} سنوات` : '',
    specialtiesAr,
    appliances: [...applianceSet],
    servicesAr,
    // Public service-area labels from the server (no coordinates).
    areasAr: [...dto.areasAr],
    aboutAr: dto.bio ?? '',
    // Server-issued public avatar (null keeps the initials fallback).
    avatarUrl: dto.avatarUrl,
    available: availability.available,
    availabilityLabelAr: availability.labelAr,
    reviews,
  };
}

async function fetchReviewsFor(id: string): Promise<ReadonlyArray<TechnicianReview>> {
  try {
    const res = await getApi().request<ReviewSummaryDto[]>(
      'GET',
      `/technicians/${id}/reviews${buildQuery({ page: 1, limit: REVIEWS_PAGE_LIMIT })}`,
      undefined,
      { auth: false },
    );
    return res.data.map(mapReviewItem);
  } catch {
    return []; // technician without reviews (or transient) → empty state
  }
}

async function hydrate(
  technicians: ReadonlyArray<TechnicianPublicDto>,
): Promise<ReadonlyArray<Technician>> {
  const hydrateCount = Math.min(technicians.length, REVIEW_HYDRATION_LIMIT);
  const reviewsLists = await Promise.all(
    technicians.slice(0, hydrateCount).map((tech) => fetchReviewsFor(tech.id)),
  );
  return Promise.all(
    technicians.map(async (dto, index) => {
      const reviews = index < hydrateCount ? (reviewsLists[index] ?? []) : [];
      return mapTechnicianCard(dto, reviews);
    }),
  );
}

export class ApiTechnicianDataSource implements TechnicianDataSourceContract {
  async getTechnicians(input: {
    role: 'customer';
    /** Every supported filter is sent server-side (WP-Discovery). */
    filters?: TechnicianListQuery;
  }): Promise<ReadonlyArray<Technician>> {
    const filters = input.filters ?? {};
    // Server-side sort by the documented rating signal; bounded drain.
    // All filters reach the API — results render as returned, preserving
    // pagination/meta correctness (never re-filtered client-side).
    const technicians = await drainPages<TechnicianPublicDto>((page, limit) =>
      getApi()
        .request<TechnicianPublicDto[]>(
          'GET',
          `/technicians${buildQuery({
            page,
            limit,
            sort: 'rating',
            ...(filters.q !== undefined ? { q: filters.q } : {}),
            ...(filters.applianceCategoryId !== undefined
              ? { appliance_category_id: filters.applianceCategoryId }
              : {}),
            ...(filters.serviceId !== undefined ? { service_id: filters.serviceId } : {}),
            ...(filters.faultId !== undefined ? { fault_id: filters.faultId } : {}),
            ...(filters.ratingMin !== undefined ? { rating_min: filters.ratingMin } : {}),
            ...(filters.area !== undefined ? { area: filters.area } : {}),
            ...(filters.availability !== undefined ? { availability: filters.availability } : {}),
          })}`,
          undefined,
          { auth: false },
        )
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    return hydrate(technicians);
  }

  /**
   * Direct detail read (WP-Discovery): the profile screen fetches the
   * technician by id instead of depending on the list window.
   */
  async getTechnicianDetail(input: { id: string }): Promise<Technician | null> {
    let dto: TechnicianPublicDto | null = null;
    try {
      const res = await getApi().request<TechnicianPublicDto>(
        'GET',
        `/technicians/${encodeURIComponent(input.id)}`,
        undefined,
        { auth: false },
      );
      dto = res.data;
    } catch {
      return null; // missing/unverified → identical null (display fallback)
    }
    const [card] = await hydrate(dto !== null ? [dto] : []);
    return card ?? null;
  }
}
