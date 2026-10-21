/**
 * Real API `TechnicianReviewsDataSource` (Task 10J; revised for 10J-R1).
 *
 * Endpoints (docs/07 §6/§10, PUBLIC): GET /technicians/:id (real rating
 * summary) + GET /technicians/:id/reviews (paginated public reviews).
 * The technician's own profile id now comes from the authoritative
 * self-profile endpoint (GET /technician/profile) — no indirect
 * resolution through the request list.
 *
 * ReviewSummaryDto exposes no customer identifiers by contract → the
 * existing author line renders the honest generic label.
 */

import { getApi } from '../../../lib/api-client';
import { formatArDate } from '../../../lib/api-format';
import { drainPages } from '../../../lib/api-query';
import { getTechnicianPublic } from '../../../lib/catalog-reference';
import { CUSTOMER_NAME_FALLBACK_AR } from '../../../lib/request-labels';

import type { TechnicianReviewItem, TechnicianReviewsDataSource, TechnicianReviewsSummary } from './technician-reviews-types';
import type { ReviewSummaryDto, TechnicianSelfProfileDto } from '@khabir/shared-types';

/** Public review → display model (no customer identifiers by contract). */
function mapReviewItem(dto: ReviewSummaryDto): TechnicianReviewItem {
  return {
    id: dto.id,
    authorAr: CUSTOMER_NAME_FALLBACK_AR,
    rating: dto.rating,
    textAr: dto.comment ?? '',
    dateAr: formatArDate(dto.createdAt),
  };
}

export class ApiTechnicianReviewsDataSource implements TechnicianReviewsDataSource {
  async getReviews(_input: { role: 'technician' }): Promise<TechnicianReviewsSummary> {
    const api = getApi();
    const self = await api.request<TechnicianSelfProfileDto>('GET', '/technician/profile').then((res) => res.data);
    const selfId = self.id;
    const [tech, reviewDtos] = await Promise.all([
      getTechnicianPublic(selfId),
      drainPages<ReviewSummaryDto>((page, limit) =>
        api
          .request<ReviewSummaryDto[]>(
            'GET',
            `/technicians/${selfId}/reviews?page=${String(page)}&limit=${String(limit)}`,
            undefined,
            { auth: false },
          )
          .then((res) => ({ items: res.data, meta: res.meta })),
      ),
    ]);
    return {
      rating: tech?.ratingAverage ?? self.ratingAverage ?? 0,
      reviewCount: tech?.ratingCount ?? self.ratingCount,
      reviews: reviewDtos.map(mapReviewItem),
    };
  }
}
