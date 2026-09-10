import { buildPageMeta } from '@khabir/shared-types';
import { describe, expect, it } from 'vitest';


describe('buildPageMeta', () => {
  it('computes totalPages with ceiling semantics', () => {
    expect(buildPageMeta(1, 20, 0)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false });
    expect(buildPageMeta(1, 20, 1).totalPages).toBe(1);
    expect(buildPageMeta(1, 20, 20).totalPages).toBe(1);
    expect(buildPageMeta(1, 20, 21).totalPages).toBe(2);
    expect(buildPageMeta(1, 20, 100).totalPages).toBe(5);
  });

  it('reports hasNext only when another page exists', () => {
    expect(buildPageMeta(1, 20, 45).hasNext).toBe(true);
    expect(buildPageMeta(2, 20, 45).hasNext).toBe(true);
    expect(buildPageMeta(3, 20, 45).hasNext).toBe(false);
    expect(buildPageMeta(1, 20, 0).hasNext).toBe(false);
  });

  it('never divides by a non-positive limit', () => {
    expect(buildPageMeta(1, 0, 10).limit).toBe(1);
    expect(buildPageMeta(1, 0, 10).totalPages).toBe(10);
  });

  it('echoes the server-normalized page and limit values', () => {
    const meta = buildPageMeta(3, 50, 120);
    expect(meta.page).toBe(3);
    expect(meta.limit).toBe(50);
    expect(meta.total).toBe(120);
  });
});
