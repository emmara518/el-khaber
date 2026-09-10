import { describe, expect, it } from 'vitest';

import { resolveRequestId } from '../src/common/request-id.middleware';

describe('request id', () => {
  it('generates a UUID v4 when no incoming id is provided', () => {
    const id = resolveRequestId(undefined);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
  });

  it('generates different ids on each call', () => {
    expect(resolveRequestId(undefined)).not.toBe(resolveRequestId(undefined));
  });

  it('accepts a well-formed incoming id', () => {
    expect(resolveRequestId('trace-abc_123.def')).toBe('trace-abc_123.def');
    expect(resolveRequestId('A1b2C3d4')).toBe('A1b2C3d4');
    expect(resolveRequestId('a'.repeat(64))).toBe('a'.repeat(64));
  });

  it('rejects ids shorter than 8 characters', () => {
    const id = resolveRequestId('short');
    expect(id).not.toBe('short');
    expect(id).toMatch(/^[0-9a-f-]{36}$/u);
  });

  it('rejects ids longer than 64 characters', () => {
    const long = 'x'.repeat(65);
    const id = resolveRequestId(long);
    expect(id).not.toBe(long);
  });

  it('rejects ids with unsafe characters (injection guard)', () => {
    for (const bad of ['id with space', 'id\nnewline', 'id;drop', 'id=dash=', 'héllo']) {
      const id = resolveRequestId(bad);
      expect(id).not.toBe(bad);
      expect(id).toMatch(/^[A-Za-z0-9._-]{8,64}$/u);
    }
  });

  it('rejects empty strings', () => {
    const id = resolveRequestId('');
    expect(id).not.toBe('');
  });
});
