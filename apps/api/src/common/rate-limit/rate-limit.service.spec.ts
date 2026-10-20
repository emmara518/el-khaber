import { beforeAll, describe, expect, it, vi } from 'vitest';

import { RateLimitService } from './rate-limit.service';

const queryRaw = vi.fn().mockResolvedValue([{ count: 1 }]);
let service: RateLimitService;

beforeAll(() => {
  process.env['NODE_ENV'] = 'test';
  process.env['DATABASE_URL'] = 'postgresql://test/test';
  process.env['DIRECT_URL'] = 'postgresql://test/test';
  process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-test-access-secret-32';
  process.env['ADMIN_JWT_ACCESS_SECRET'] = 'test-admin-secret-test-admin-secret-32';
  service = new RateLimitService({ $queryRaw: queryRaw } as never);
});

describe('RateLimitService raw insert', () => {
  it('supplies id and updated_at after the legacy defaults were dropped', async () => {
    const result = await service.checkLimit('auth', '127.0.0.1');
    expect(result.allowed).toBe(true);

    const call = queryRaw.mock.calls[0] as unknown as [TemplateStringsArray, ...unknown[]];
    const sql = call[0].join('?');
    const values = call.slice(1);

    expect(sql).toContain('"id"');
    expect(sql).toContain('"updated_at"');
    expect(sql).toContain('ON CONFLICT ("policy", "identifier", "window_start")');
    expect(values[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(values[1]).toBe('auth');
    expect(values[2]).toBe('127.0.0.1');
    expect(values[4]).toBeInstanceOf(Date);
  });
});
