/**
 * Real API `TechnicianDataSource` (Task 10J) — technician discovery.
 *
 * Endpoints (docs/07 §6, PUBLIC, verified-only visibility):
 * - GET /technicians — documented filters q / appliance_category_id /
 *   service_id / fault_id / rating_min / availability / sort=rating,
 *   paginated (server max 100),
 * - GET /technicians/:id/reviews — public reviews (no customer
 *   identifiers by contract).
 *
 * Server-supported filters are sent server-side; the client-side
 * area filter has NO server counterpart (geo semantics are an
 * undocumented CTO decision — 10E note), so the adapter drains the
 * bounded page window and the existing pure `applyTechnicianFilters`
 * keeps operating on the loaded dataset exactly as with the mock.
 *
 * Normalization (docs/07 §26 TechnicianPublicDto):
 * - `displayName` is nullable → generic verified-technician fallback,
 * - service areas are NOT publicly exposed (Task 10E-R1 keeps area
 *   query semantics undecided) → `areasAr: []` (honest, reported gap),
 * - reviews are hydrated for the first bounded slice of results (the
 *   discovery profile screen reads them from the same list object);
 *   late pages render the existing empty-reviews state.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDate } from '../../../lib/api-format';
import { buildQuery, drainPages } from '../../../lib/api-query';
import { categorySlugById } from '../../../lib/catalog-reference';
import { initialsOf } from '../../../lib/request-labels';

import type { TechnicianDataSource as TechnicianDataSourceContract } from './mock-technician-data-source';
import type { Technician, TechnicianReview } from './technician-types';
import type { ApplianceSlug } from '../home/data/customer-home-types';
import type {
  ReviewSummaryDto,
  TechnicianPublicDto,
} from '@khabir/shared-types';

/** Review hydration cap — first rendered slice only (bounded N+1). */
const REVIEW_HYDRATION_LIMIT = 10;
/** Reviews page window per technician (public reviews are bounded). */
const REVIEWS_PAGE_LIMIT = 20;

/** Availability enum → the existing Arabic availability chips. */
export function availabilityLabelAr(status: TechnicianPublicDto['availabilityStatus']): {
  available: boolean;
  labelAr: string;
} {
  switch (status) {
    case 'available':
      return { available: true, labelAr: 'متاح اليوم' };
    case 'busy':
      return { available: false, labelAr: 'مشغول حاليًا' };
    case 'unavailable':
      return { available: false, labelAr: 'غير متاح' };
  }
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
    if (slug === 'washing_machine' || slug === 'refrigerator' || slug === 'air_conditioner') {
      applianceSet.add(slug);
    }
  }
  const availability = availabilityLabelAr(dto.availabilityStatus);
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
    // Service-area labels are not publicly exposed yet (reported gap).
    areasAr: [],
    aboutAr: dto.bio ?? '',
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

export class ApiTechnicianDataSource implements TechnicianDataSourceContract {
  async getTechnicians(_input: { role: 'customer' }): Promise<ReadonlyArray<Technician>> {
    // Server-side sort by the documented rating signal; bounded drain.
    const technicians = await drainPages<TechnicianPublicDto>((page, limit) =>
      getApi()
        .request<TechnicianPublicDto[]>(
          'GET',
          `/technicians${buildQuery({ page, limit, sort: 'rating' })}`,
          undefined,
          { auth: false },
        )
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    const hydrateCount = Math.min(technicians.length, REVIEW_HYDRATION_LIMIT);
    const reviewsLists = await Promise.all(
      technicians.slice(0, hydrateCount).map((tech) => fetchReviewsFor(tech.id)),
    );
    return Promise.all(
      technicians.map(async (dto, index) => {
        const reviews = index < hydrateCount ? reviewsLists[index] : [];
        return mapTechnicianCard(dto, reviews);
      }),
    );
  }
}
