/**
 * Test-database resolver with a fail-closed host allowlist.
 *
 * Integration specs MUST never touch khabir-dev, khabir-prod, or any other
 * shared database. Only isolated, disposable PostgreSQL instances are
 * allowed:
 *   - loopback hosts (localhost, 127.0.0.1, ::1)
 *   - the CI service hostname `postgres`
 *   - the docker-compose service hostname `test-db`
 *
 * Source precedence:
 *   1. process.env.TEST_DATABASE_URL
 *   2. DATABASE_URL from apps/api/.env.test (parsed, never mutating process.env)
 *
 * An absent URL means "integration specs skip" for a local developer. In CI
 * it is a hard failure: integration coverage must not silently disappear.
 * A present URL that is not allowlisted throws immediately.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'dotenv';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'test-db']);

const here = dirname(fileURLToPath(import.meta.url));

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.has(hostname.replace(/^\[|\]$/g, '').toLowerCase());
}

/**
 * Validates a candidate test URL. Returns the URL when allowed, '' when
 * absent, and throws when present but unsafe.
 */
export function assertIsolatedTestDatabaseUrl(raw: string, source: string): string {
  const value = raw.trim();
  if (value === '') {
    return '';
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${source} is not a valid PostgreSQL URL.`);
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(`${source} must use the postgres:// or postgresql:// scheme.`);
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (/supabase\.(com|co|in)/i.test(host)) {
    throw new Error(
      `${source} points at a managed Supabase database (${host}). khabir-dev and khabir-prod are forbidden for tests.`,
    );
  }
  if (!isAllowedHost(host)) {
    throw new Error(
      `${source} host '${host}' is not an isolated test database. ` +
        'Allowed hosts: localhost, 127.0.0.1, ::1, postgres, test-db.',
    );
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (database !== 'khabir_test') {
    throw new Error(
      `${source} must target the dedicated khabir_test database, got '${database}'.`,
    );
  }

  return value;
}

function isCi(): boolean {
  return process.env['CI'] === 'true' || process.env['GITHUB_ACTIONS'] === 'true';
}

/** Reads the isolated test URL, or '' when none is configured locally. */
export function readTestDatabaseUrl(): string {
  const fromEnv = assertIsolatedTestDatabaseUrl(
    process.env['TEST_DATABASE_URL'] ?? '',
    'TEST_DATABASE_URL',
  );
  if (fromEnv !== '') {
    return fromEnv;
  }

  // CI must always run the integration coverage against a disposable
  // database. Do not fall back to .env.test or silently skip.
  if (isCi()) {
    throw new Error(
      'CI integration tests require TEST_DATABASE_URL pointing at an isolated PostgreSQL host.',
    );
  }

  try {
    const parsed = parse(readFileSync(join(here, '..', '.env.test'), 'utf8')) as Record<
      string,
      string
    >;
    return assertIsolatedTestDatabaseUrl(parsed['DATABASE_URL'] ?? '', 'apps/api/.env.test');
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('apps/api/.env.test')) {
      throw error;
    }
    return '';
  }
}

/**
 * Bounds each TEST client's pool. Pure string transform: it does not read
 * or mutate process.env, so it cannot leak across worker-shared spec files.
 */
export function withTestPoolLimit(rawUrl: string): string {
  if (rawUrl === '' || /[?&]connection_limit=/.test(rawUrl)) {
    return rawUrl;
  }
  const separator = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${separator}connection_limit=2&pool_timeout=20`;
}
