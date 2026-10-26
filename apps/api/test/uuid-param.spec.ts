import { describe, expect, it } from 'vitest';

import { UuidParamPipe } from '../src/common/uuid-param.pipe';

const metadata = (data: string): { type: 'param'; data: string } => ({
  type: 'param',
  data,
});

describe('UuidParamPipe', () => {
  it('maps malformed mediaId to the same 404 as a missing resource', () => {
    const pipe = new UuidParamPipe();
    expect(() => pipe.transform('not-a-uuid', metadata('mediaId') as never)).toThrow(
      /not found/i,
    );
  });

  it('accepts a valid mediaId without changing it', () => {
    const pipe = new UuidParamPipe();
    const id = '11111111-1111-4111-8111-111111111111';
    expect(pipe.transform(id, metadata('mediaId') as never)).toBe(id);
  });
});
