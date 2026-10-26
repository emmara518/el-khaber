import { afterEach, describe, expect, it } from 'vitest';

import { assertIsolatedTestDatabaseUrl, readTestDatabaseUrl } from './real-db-url';

const ORIGINAL = {
  CI: process.env['CI'],
  GITHUB_ACTIONS: process.env['GITHUB_ACTIONS'],
  TEST_DATABASE_URL: process.env['TEST_DATABASE_URL'],
};

function restore(): void {
  for (const [key, value] of Object.entries(ORIGINAL)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

afterEach(restore);

describe('isolated test database guard', () => {
  it('accepts loopback and the CI service host', () => {
    expect(
      assertIsolatedTestDatabaseUrl('postgresql://u:p@localhost:5432/khabir_test', 'test'),
    ).toContain('localhost');
    expect(assertIsolatedTestDatabaseUrl('postgresql://u:p@postgres:5432/khabir_test', 'test')).toContain(
      'postgres',
    );
  });

  it('rejects Supabase and non-isolated hosts', () => {
    expect(() =>
      assertIsolatedTestDatabaseUrl('postgresql://u:p@db.x.supabase.co:5432/postgres', 'test'),
    ).toThrow(/Supabase/i);
    expect(() =>
      assertIsolatedTestDatabaseUrl('postgresql://u:p@10.0.0.5:5432/db', 'test'),
    ).toThrow(/not an isolated test database/i);
    expect(() =>
      assertIsolatedTestDatabaseUrl('postgresql://u:p@localhost:5432/khabir_dev', 'test'),
    ).toThrow(/khabir_test/i);
  });

  it('fails closed in CI when TEST_DATABASE_URL is omitted', () => {
    process.env['CI'] = 'true';
    delete process.env['TEST_DATABASE_URL'];
    delete process.env['GITHUB_ACTIONS'];
    expect(() => readTestDatabaseUrl()).toThrow(/require TEST_DATABASE_URL/i);
  });

  it('does not skip in CI when the isolated URL is present', () => {
    process.env['CI'] = 'true';
    process.env['TEST_DATABASE_URL'] = 'postgresql://u:p@localhost:5432/khabir_test';
    expect(readTestDatabaseUrl()).toBe('postgresql://u:p@localhost:5432/khabir_test');
  });
});
