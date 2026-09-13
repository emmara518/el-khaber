import { describe, expect, it } from 'vitest';

import { initialsOf, isActiveStatus, REQUEST_STATUS_LABELS_AR } from './request-labels';

describe('request-labels', () => {
  it('labels every canonical lifecycle status', () => {
    for (const status of [
      'pending',
      'accepted',
      'on_the_way',
      'in_progress',
      'completed',
      'cancelled',
    ] as const) {
      expect(REQUEST_STATUS_LABELS_AR[status].length).toBeGreaterThan(0);
    }
  });

  it('classifies active statuses', () => {
    expect(isActiveStatus('pending')).toBe(true);
    expect(isActiveStatus('in_progress')).toBe(true);
    expect(isActiveStatus('completed')).toBe(false);
    expect(isActiveStatus('cancelled')).toBe(false);
  });

  it('extracts the first Arabic initial', () => {
    expect(initialsOf('محمد')).toBe('م');
    expect(initialsOf('   ')).toBe('');
  });
});