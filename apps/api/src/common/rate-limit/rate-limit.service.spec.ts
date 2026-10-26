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
    const normalizedSql = sql.replace(/\s+/g, ' ');

    const insert = normalizedSql.match(
      /INSERT\s+INTO\s+"rate_limit_buckets"\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i,
    );
    expect(insert).not.toBeNull();

    const insertColumns = (insert?.[1] ?? '')
      .split(',')
      .map((column) => column.trim().replaceAll('"', ''));

    const insertValues = (insert?.[2] ?? '').split(',').map((value) => value.trim());

    expect(insertColumns).toEqual([
      'id',
      'policy',
      'identifier',
      'window_start',
      'count',
      'updated_at',
    ]);

    // Prove the ID and updated_at are bound VALUES, not column names alone.
    expect(insertValues).toEqual(['?::uuid', '?', '?', '?', '1', '?']);

    expect(values[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(values[1]).toBe('auth');
    expect(values[2]).toBe('127.0.0.1');
    expect(values[3]).toBeInstanceOf(Date);
    expect(values[4]).toBeInstanceOf(Date);

    // Preserve atomic counter increment and conflict-window semantics.
    expect(normalizedSql).toContain(
      'ON CONFLICT ("policy", "identifier", "window_start") DO UPDATE',
    );
    expect(normalizedSql).toMatch(/SET "count" = "rate_limit_buckets"\."count" \+ 1/i);
    expect(normalizedSql).toMatch(/"updated_at" = now\(\)/i);
  });

  it('hashes over-long identifiers so the VARCHAR(255) column never overflows', async () => {
    queryRaw.mockClear();
    const longIdentifier = `${'a'.repeat(240)}@example.com|2001:db8::1`;
    expect(longIdentifier.length).toBeGreaterThan(255);

    await service.checkLimit('login', longIdentifier);

    const values = (queryRaw.mock.calls[0] as unknown as [TemplateStringsArray, ...unknown[]]).slice(
      1,
    );
    const stored = values[2] as string;

    expect(stored).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(stored.length).toBeLessThanOrEqual(255);
    expect(stored).not.toContain('example.com');
  });
});
