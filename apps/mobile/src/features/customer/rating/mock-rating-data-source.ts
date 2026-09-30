/**
 * Mock `RatingDataSource`.
 *
 * Deterministic: exposes a small canonical tag list (server-owned in the
 * real adapter) and resolves `{ ok: true }` — or throws in `failing` mode.
 * No persistence is claimed; the submitted review lives only in the call
 * arguments (asserted by tests). Never used in the runtime app.
 */

import type { RatingDataSource, RatingInput, ReviewTag } from './rating-types';

export class RatingSubmitError extends Error {
  constructor(message = 'فشل إرسال التقييم. حاول مجددًا') {
    super(message);
    this.name = 'RatingSubmitError';
  }
}

const MOCK_TAGS: ReadonlyArray<ReviewTag> = [
  { id: 'tag-1', labelAr: 'سرعة الاستجابة' },
  { id: 'tag-2', labelAr: 'الالتزام بالموعد' },
];

export class MockRatingDataSource implements RatingDataSource {
  public readonly submitted: RatingInput[] = [];

  constructor(private readonly mode: 'success' | 'failing' = 'success') {}

  async listTags(): Promise<ReadonlyArray<ReviewTag>> {
    return MOCK_TAGS;
  }

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
