import { describe, expect, it } from 'vitest';

import { buildQuery, drainPages, MAX_DRAIN_PAGES, PAGE_LIMIT } from './api-query';

describe('buildQuery', () => {
  it('skips undefined/null/empty values', () => {
    expect(buildQuery({ a: 1, b: undefined, c: '', d: 'x' })).toBe('?a=1&d=x');
  });

  it('returns an empty suffix when nothing is set', () => {
    expect(buildQuery({ a: null })).toBe('');
  });
});

describe('drainPages', () => {
  it('walks bounded pages until hasNext is false', async () => {
    const pages: Array<{ items: number[]; hasNext: boolean }> = [
      { items: [1, 2], hasNext: true },
      { items: [3], hasNext: false },
    ];
    const result = await drainPages<number>((page, limit) => {
      expect(limit).toBe(PAGE_LIMIT);
      return Promise.resolve({
        items: pages[page - 1].items,
        meta: { page, limit, hasNext: pages[page - 1].hasNext },
      });
    });
    expect(result).toEqual([1, 2, 3]);
  });

  it('never exceeds the bounded page cap', async () => {
    let calls = 0;
    const result = await drainPages<number>((_page, _limit) =>
      Promise.resolve({
        items: [calls],
        meta: { page: _page, limit: _limit, hasNext: true },
      }).then((res) => {
        calls += 1;
        return res;
      }),
    );
    expect(calls).toBeLessThanOrEqual(MAX_DRAIN_PAGES);
    expect(result).toHaveLength(MAX_DRAIN_PAGES);
  });
});