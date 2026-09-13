/**
 * Real API `RatingDataSource` (Task 10J).
 *
 * Endpoint: POST /service-requests/:id/review (docs/07 §10). Eligibility
 * (owner + completed + one-per-request) is server-authoritative.
 *
 * DISCOVERED CONTRACT GAP (reported, NOT invented around): the UI's
 * Arabic tag chips cannot be submitted — `tag_ids` must reference
 * seeded review-tag UUIDs and no public endpoint enumerates them
 * (docs/07 §10 "tags must reference seeded review tags"). Tags are
 * therefore omitted from the payload until a tags endpoint exists;
 * rating + comment are submitted for real. Duplicate submission
 * (409 CONFLICT) maps to the product-consistent "already reviewed"
 * state.
 */

import { getApi } from '../../../lib/api-client';
import { toUserMessage } from '../../../lib/api-error';

import { RatingSubmitError } from './mock-rating-data-source';

import type { RatingDataSource, RatingInput } from './rating-types';

export { RatingSubmitError };

const SUBMIT_FALLBACK_AR = 'فشل إرسال التقييم. حاول مجددًا';
const ALREADY_REVIEWED_AR = 'تم إرسال تقييم لهذا الطلب مسبقًا';

export class ApiRatingDataSource implements RatingDataSource {
  async submitRating(input: RatingInput): Promise<{ ok: true }> {
    try {
      await getApi().request('POST', `/service-requests/${input.requestId}/review`, {
        rating: input.stars,
        // comment stays optional — omitted when empty.
        ...(input.commentAr.trim().length > 0 ? { comment: input.commentAr.trim() } : {}),
        // tag_ids omitted: no tags-enumeration endpoint exists (gap).
      });
      return { ok: true } as const;
    } catch (err: unknown) {
      const code = err instanceof Error && 'code' in err ? String((err as { code?: unknown }).code) : '';
      if (code === 'CONFLICT') throw new RatingSubmitError(ALREADY_REVIEWED_AR);
      throw new RatingSubmitError(toUserMessage(err, SUBMIT_FALLBACK_AR));
    }
  }
}
