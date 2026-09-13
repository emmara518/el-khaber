/**
 * Real API `TechnicianReviewsDataSource` (Task 10J).
 *
 * Endpoints (docs/07 §6/§10, PUBLIC): GET /technicians/:id (real
 * rating summary) + GET /technicians/:id/reviews (paginated public
 * reviews). The technician's own profile id is resolved through the
 * role-scoped request list (lib/self-technician — see the reported
 * self-service endpoint gap).
 *
 * ReviewSummaryDto exposes no customer identifiers by contract →
 * the existing author line renders the honest generic label.
 */

import { getApi } from '../../../lib/api-client';
import { drainPages } from '../../../lib/api-query';
import { getTechnicianPublic } from '../../../lib/catalog-reference';
import { mapReviewItem } from '../../customer/discovery/api-technician-data-source';

import type { TechnicianReviewsDataSource, TechnicianReviewsSummary } from './technician-reviews-types';
import type { ReviewSummaryDto } from '@khabir/shared-types';

export class ApiTechnicianReviewsDataSource implements TechnicianReviewsDataSource {
  async getReviews(_input: { role: 'technician' }): Promise<TechnicianReviewsSummary> {
    const api = getApi();
    // Resolve the technician's own public-profile id from the
    // role-scoped request list (documented read, no side effects).
    const summaries = await drainPages<{ technicianId: string | null }>((page, limit) =>
      api
        .request<Array<{ technicianId: string | null }>>(
          'GET',
          `/service-requests?page=${String(page)}&limit=${String(limit)}`,
        )
        .then((res) => ({ items: res.data, meta: res.meta })),
    );
    const selfId = summaries.find((s) => s.technicianId !== null)?.technicianId ?? null;
    if (selfId === null) {
      // No resolvable profile yet → honest empty reviews.
      return { rating: 0, reviewCount: 0, reviews: [] };
    }
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
      rating: tech?.ratingAverage ?? 0,
      reviewCount: tech?.ratingCount ?? 0,
      reviews: reviewDtos.map(mapReviewItem),
    };
  }
}
