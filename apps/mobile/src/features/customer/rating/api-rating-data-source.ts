/**
 * Real API `RatingDataSource` (Task 10J; WP-2C tags).
 *
 * Endpoints:
 *   - GET /review-tags — canonical active tags (public).
 *   - POST /service-requests/:id/review (docs/07 §10). Eligibility
 *     (owner + completed + one-per-request) is server-authoritative.
 *
 * Selected tags are submitted as `tag_ids` (canonical UUIDs); the backend
 * validates them against the seeded taxonomy. Duplicate submission
 * (409 CONFLICT) maps to the product-consistent "already reviewed" state.
 */

import { getApi } from '../../../lib/api-client';
import { toUserMessage } from '../../../lib/api-error';

import { RatingSubmitError } from './mock-rating-data-source';

import type { RatingDataSource, RatingInput, ReviewTag } from './rating-types';

export { RatingSubmitError };

const SUBMIT_FALLBACK_AR = 'فشل إرسال التقييم. حاول مجددًا';
const ALREADY_REVIEWED_AR = 'تم إرسال تقييم لهذا الطلب مسبقًا';

export class ApiRatingDataSource implements RatingDataSource {
  async listTags(): Promise<ReadonlyArray<ReviewTag>> {
    const res = await getApi().request<ReviewTag[]>('GET', '/review-tags', undefined, {
      auth: false,
    });
    return res.data;
  }

  async submitRating(input: RatingInput): Promise<{ ok: true }> {
    try {
      await getApi().request('POST', `/service-requests/${input.requestId}/review`, {
        rating: input.stars,
        // comment stays optional — omitted when empty.
        ...(input.commentAr.trim().length > 0 ? { comment: input.commentAr.trim() } : {}),
        // Canonical tag UUIDs (omitted when none selected).
        ...(input.tagIds.length > 0 ? { tag_ids: [...input.tagIds] } : {}),
      });
      return { ok: true } as const;
    } catch (err: unknown) {
      const code = err instanceof Error && 'code' in err ? String((err as { code?: unknown }).code) : '';
      if (code === 'CONFLICT') throw new RatingSubmitError(ALREADY_REVIEWED_AR);
      throw new RatingSubmitError(toUserMessage(err, SUBMIT_FALLBACK_AR));
    }
  }
}
