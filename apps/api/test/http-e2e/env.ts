/**
 * Fail-closed guard for the isolated real-HTTP E2E environment (Task 10N).
 *
 * The suite MUST run against the dedicated local `khabir_test` database
 * (ephemeral PostGIS container, see docker-compose.test.yml) and MUST NEVER
 * touch khabir-dev, staging, or production. Any ambiguity is a hard
 * failure: the harness refuses to boot rather than risk the wrong database.
 *
 * Guards applied, in order:
 *   1. TEST_DATABASE_URL must be present (never falls back to DATABASE_URL).
 *   2. it must be a postgres:// URL.
 *   3. it must NOT point at Supabase (khabir-dev/prod live there).
 *   4. the database name must not look like dev/production.
 *   5. the database name must be the dedicated khabir_test database.
 *   6. the host must be local unless an explicit opt-in is set.
 *   7. after connecting: current_database() must be khabir_test AND the
 *      safety marker row provisioned by provision-test-db.mjs must exist.
 */

const SUPABASE_RE = /supabase\.(com|co|net|in)/i;
const FORBIDDEN_NAME_RE = /(prod|production|khabir[-_]dev)/i;
const REQUIRED_DB_NAME_RE = /^khabir[_-]test$/i;

export interface TestDbTarget {
  readonly url: string;
  readonly host: string;
  readonly database: string;
}

export function resolveTestDatabaseUrl(env: NodeJS.ProcessEnv = process.env): TestDbTarget {
  const raw = env['TEST_DATABASE_URL']?.trim();
  if (!raw) {
    throw new Error(
      'HTTP E2E refused: TEST_DATABASE_URL is not set. The isolated khabir_test database is required. Run `node apps/api/scripts/provision-test-db.mjs`.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('HTTP E2E refused: TEST_DATABASE_URL is not a valid URL.');
  }

  if (!/^postgres(ql)?:$/.test(parsed.protocol)) {
    throw new Error(`HTTP E2E refused: TEST_DATABASE_URL must be postgres:, got ${parsed.protocol}`);
  }
  if (SUPABASE_RE.test(raw)) {
    throw new Error(
      'HTTP E2E refused: TEST_DATABASE_URL points at Supabase. khabir-dev and production are forbidden.',
    );
  }

  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (FORBIDDEN_NAME_RE.test(database)) {
    throw new Error(`HTTP E2E refused: database "${database}" looks like a dev/production database.`);
  }
  if (!REQUIRED_DB_NAME_RE.test(database)) {
    throw new Error(
      `HTTP E2E refused: database "${database}" is not the dedicated khabir_test database.`,
    );
  }

  const host = parsed.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!isLocal && env['KHABIR_TEST_ALLOW_REMOTE_DB'] !== '1') {
    throw new Error(
      `HTTP E2E refused: host "${host}" is not local. Set KHABIR_TEST_ALLOW_REMOTE_DB=1 only for a dedicated remote TEST database (never dev/prod).`,
    );
  }

  return { url: raw, host, database };
}

export interface RawQueryClient {
  $queryRawUnsafe<T = unknown>(sql: string): Promise<T>;
}

/** Verifies the CONNECTED database is the provisioned khabir_test instance. */
export async function assertTestDatabaseIdentity(client: RawQueryClient): Promise<void> {
  const rows = await client.$queryRawUnsafe<Array<{ current_database: string }>>(
    'SELECT current_database()',
  );
  const name = rows[0]?.current_database ?? '';
  if (!REQUIRED_DB_NAME_RE.test(name)) {
    throw new Error(`HTTP E2E refused: connected database "${name}" is not khabir_test.`);
  }
  const marker = await client.$queryRawUnsafe<Array<{ token: string }>>(
    "SELECT token FROM test_environment_marker WHERE token = 'khabir-test'",
  );
  if (marker.length !== 1) {
    throw new Error(
      'HTTP E2E refused: safety marker row missing. Run `node apps/api/scripts/provision-test-db.mjs`.',
    );
  }
}
