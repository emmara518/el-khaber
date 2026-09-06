/**
 * Mock `RatingDataSource` (Batch E).
 *
 * Deterministic: validates the shape (stars 1–5, non-empty ids),
 * waits briefly, resolves `{ ok: true }` — or throws in `failing`
 * mode. No persistence is claimed; the submitted review lives only
 * in the call arguments (asserted by tests).
 */

import type { RatingDataSource, RatingInput } from './rating-types';

export class RatingSubmitError extends Error {
  constructor(message = 'فشل إرسال التقييم. حاول مجددًا') {
    super(message);
    this.name = 'RatingSubmitError';
  }
}

export class MockRatingDataSource implements RatingDataSource {
  public readonly submitted: RatingInput[] = [];

  constructor(private readonly mode: 'success' | 'failing' = 'success') {}

  async submitRating(input: RatingInput): Promise<{ ok: true }> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (this.mode === 'failing') throw new RatingSubmitError();
    if (input.stars < 1 || input.stars > 5 || input.requestId.length === 0 || input.technicianId.length === 0) {
      throw new RatingSubmitError('بيانات التقييم غير مكتملة');
    }
    this.submitted.push(input);
    return { ok: true };
  }
}
