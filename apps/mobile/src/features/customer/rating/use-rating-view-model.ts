/**
 * View-model hook for the customer rating form.
 *
 * Owns selection state + submission lifecycle with a duplicate
 * guard: while submitting (or after success) further submits are
 * ignored. Accepts a data-source override for error-path QA.
 */

import { useCallback, useState } from 'react';

import { MockRatingDataSource } from './mock-rating-data-source';
import { toggleTag, validateRating, type RatingDataSource } from './rating-types';

export type RatingSubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface RatingViewModel {
  stars: number | null;
  selectStars: (stars: number) => void;
  tags: ReadonlyArray<string>;
  toggle: (tag: string) => void;
  comment: string;
  setComment: (text: string) => void;
  fieldError: string | null;
  submitStatus: RatingSubmitStatus;
  submitError: string | null;
  submit: () => void;
  retry: () => void;
}

export function useRatingViewModel(
  input: { requestId: string; technicianId: string },
  source: RatingDataSource = new MockRatingDataSource(),
): RatingViewModel {
  const [stars, setStars] = useState<number | null>(null);
  const [tags, setTags] = useState<ReadonlyArray<string>>([]);
  const [comment, setComment] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<RatingSubmitStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectStars = useCallback((value: number) => {
    setStars(value);
    setFieldError(null);
  }, []);

  const toggle = useCallback((tag: string) => {
    setTags((current) => toggleTag(current, tag));
  }, []);

  const submit = useCallback(() => {
    // Duplicate guard: ignore while submitting or after success.
    if (submitStatus === 'submitting' || submitStatus === 'success') return;
    const error = validateRating(stars);
    setFieldError(error);
    if (error !== null || stars === null) return;
    setSubmitStatus('submitting');
    setSubmitError(null);
    const selected = stars;
    void (async () => {
      try {
        await source.submitRating({
          requestId: input.requestId,
          technicianId: input.technicianId,
          stars: selected,
          tags,
          commentAr: comment.trim(),
        });
        setSubmitStatus('success');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'فشل إرسال التقييم');
        setSubmitStatus('error');
      }
    })();
     
  }, [submitStatus, stars, tags, comment, source, input.requestId, input.technicianId]);

  const retry = useCallback(() => {
    setSubmitStatus('idle');
    setSubmitError(null);
  }, []);

  return {
    stars,
    selectStars,
    tags,
    toggle,
    comment,
    setComment,
    fieldError,
    submitStatus,
    submitError,
    submit,
    retry,
  };
}
