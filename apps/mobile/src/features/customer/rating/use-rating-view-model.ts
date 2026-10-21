/**
 * View-model hook for the customer rating form.
 *
 * Owns selection state + submission lifecycle with a duplicate guard:
 * while submitting (or after success) further submits are ignored.
 * Canonical tags are fetched from the server (WP-2C); selection is by
 * tag UUID. Accepts a data-source override for error-path QA.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApiRatingDataSource } from './api-rating-data-source';
import { toggleTag, validateRating, type RatingDataSource, type ReviewTag } from './rating-types';

export type RatingSubmitStatus = 'idle' | 'submitting' | 'success' | 'error';
export type RatingTagsStatus = 'loading' | 'loaded' | 'error';

export interface RatingViewModel {
  stars: number | null;
  selectStars: (stars: number) => void;
  availableTags: ReadonlyArray<ReviewTag>;
  tagsStatus: RatingTagsStatus;
  selectedTagIds: ReadonlyArray<string>;
  toggleTagId: (tagId: string) => void;
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
  source?: RatingDataSource,
): RatingViewModel {
  const dataSource = useMemo<RatingDataSource>(
    () => source ?? new ApiRatingDataSource(),
    [source],
  );

  const [stars, setStars] = useState<number | null>(null);
  const [availableTags, setAvailableTags] = useState<ReadonlyArray<ReviewTag>>([]);
  const [tagsStatus, setTagsStatus] = useState<RatingTagsStatus>('loading');
  const [selectedTagIds, setSelectedTagIds] = useState<ReadonlyArray<string>>([]);
  const [comment, setComment] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<RatingSubmitStatus>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setTagsStatus('loading');
    void (async () => {
      try {
        const tags = await dataSource.listTags();
        if (!active) return;
        setAvailableTags(tags);
        setTagsStatus('loaded');
      } catch {
        if (!active) return;
        setAvailableTags([]);
        setTagsStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [dataSource]);

  const selectStars = useCallback((value: number) => {
    setStars(value);
    setFieldError(null);
  }, []);

  const toggleTagId = useCallback((tagId: string) => {
    setSelectedTagIds((current) => toggleTag(current, tagId));
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
        await dataSource.submitRating({
          requestId: input.requestId,
          technicianId: input.technicianId,
          stars: selected,
          tagIds: selectedTagIds,
          commentAr: comment.trim(),
        });
        setSubmitStatus('success');
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'فشل إرسال التقييم');
        setSubmitStatus('error');
      }
    })();
  }, [submitStatus, stars, selectedTagIds, comment, dataSource, input.requestId, input.technicianId]);

  const retry = useCallback(() => {
    setSubmitStatus('idle');
    setSubmitError(null);
  }, []);

  return {
    stars,
    selectStars,
    availableTags,
    tagsStatus,
    selectedTagIds,
    toggleTagId,
    comment,
    setComment,
    fieldError,
    submitStatus,
    submitError,
    submit,
    retry,
  };
}
