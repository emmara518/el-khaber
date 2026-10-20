/**
 * Hard safety gate for every QA/seed script.
 *
 * Requirements (all mandatory):
 *   1. ALLOW_QA_SEED=true — an explicit, per-run opt-in.
 *   2. NODE_ENV !== 'production'.
 *   3. DATABASE_URL points at an isolated host (loopback, CI `postgres`,
 *      or the docker-compose `test-db` service). Supabase/shared hosts are
 *      rejected even if the string contains "test".
 *
 * A URL substring check is NOT sufficient; the host is parsed and
 * allowlisted. Failing closed is intentional.
 */

const { URL } = require('node:url');

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'postgres', 'test-db']);

function assertQaSeedAllowed(scriptName) {
  const label = typeof scriptName === 'string' ? scriptName : 'qa-script';

  if (process.env.ALLOW_QA_SEED !== 'true') {
    throw new Error(
      `${label}: refused. Set ALLOW_QA_SEED=true explicitly (seed/QA scripts never run by accident).`,
    );
  }
  if ((process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error(`${label}: refused in production.`);
  }

  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error(`${label}: DATABASE_URL is required.`);
  }

  let host;
  try {
    host = new URL(raw).hostname.replace(/^\[|\]$/g, '').toLowerCase();
  } catch {
    throw new Error(`${label}: DATABASE_URL is not a valid URL.`);
  }

  if (/supabase\.(com|co|in)/i.test(host)) {
    throw new Error(`${label}: refused. Supabase/shared databases are forbidden for QA seeds.`);
  }
  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error(
      `${label}: refused host '${host}'. Allowed: ${Array.from(ALLOWED_HOSTS).join(', ')}.`,
    );
  }
}

module.exports = { assertQaSeedAllowed, ALLOWED_HOSTS };
