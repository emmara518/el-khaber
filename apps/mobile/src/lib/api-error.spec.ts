import { describe, expect, it } from 'vitest';

import { isNetworkError, toUserMessage } from './api-error';

// Replicate the canonical error shape without depending on the
// HTTP client / secure-store chain (native module, not unit-loaded).
class CanonicalError extends Error {
  public readonly status: number;
  public readonly code: string;
  constructor(status: number, code: string) {
    super('server message');
    this.status = status;
    this.code = code;
  }
}

describe('isNetworkError', () => {
  it('recognizes fetch/network failures', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('Load failed'))).toBe(true);
    expect(isNetworkError(new Error('boom'))).toBe(false);
  });
});

describe('toUserMessage', () => {
  it('passes through adapter-raised (already user-safe) messages', () => {
    expect(toUserMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('returns the network copy for connectivity failures', () => {
    expect(toUserMessage(new Error('Failed to fetch'), 'fallback')).toContain('الإنترنت');
  });

  it('returns the Arabic fallback for unknown errors with empty messages', () => {
    expect(toUserMessage(new Error(''), 'fallback-ar')).toBe('fallback-ar');
  });

  it('maps canonical codes when the error exposes a code', () => {
    const err = new CanonicalError(409, 'INVALID_STATE_TRANSITION');
    const mapped = toUserMessage(err, 'fallback');
    // Known canonical code mapped through the module (exported table).
    expect(mapped).toContain('الحالة الحالية');
  });
});