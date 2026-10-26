#!/usr/bin/env node
/**
 * Presence-only environment check for the authorized UAT target.
 *
 * Reports MISSING NAMES and validation failures. It never prints a value,
 * so it is safe to run in CI logs and release evidence.
 *
 *   node scripts/release/check-env-presence.mjs --scope api --file apps/api/.env
 *   node scripts/release/check-env-presence.mjs --scope web          # process.env
 *
 * Scope:
 *   api   - runtime secrets, database URLs, auth secrets, storage, email gate
 *   web   - EXPO_PUBLIC_API_URL baked into the exported web app
 *   admin - NEXT_PUBLIC_API_URL baked into the admin build
 *
 * Exit code 1 when a blocking variable is missing or fails validation.
 * Feature-gated variables are reported as warnings, never as passes.
 */

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const value = args[i + 1];
  if (value === undefined || value.startsWith('--')) {
    console.error(`--${name} requires a value`);
    process.exit(2);
  }
  return value;
}

const scope = arg('scope', 'api');
const file = arg('file', '');
if (!['api', 'web', 'admin'].includes(scope)) {
  console.error(`Invalid --scope '${scope}' (api|web|admin)`);
  process.exit(2);
}

function parseDotenv(path) {
  const env = {};
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Ignore inline comments only when the value is clearly unquoted metadata.
    const comment = value.search(/\s+#/);
    if (comment !== -1) value = value.slice(0, comment).trim();
    env[key] = value;
  }
  return env;
}

let env;
if (file !== '') {
  try {
    env = parseDotenv(file);
  } catch (error) {
    console.error(`Cannot read env file: ${file} (${error.message})`);
    process.exit(2);
  }
} else {
  env = process.env;
}

const has = (name) => typeof env[name] === 'string' && env[name].trim() !== '';
const failures = [];
const warnings = [];
const checks = [];

function requireNames(group, names) {
  const missing = names.filter((name) => !has(name));
  if (missing.length > 0) {
    failures.push(`${group}: missing ${missing.join(', ')}`);
  } else {
    checks.push(`${group}: present (${names.length})`);
  }
}

function warnMissing(group, names, reason) {
  const missing = names.filter((name) => !has(name));
  if (missing.length > 0) {
    warnings.push(`${group}: not configured (${missing.join(', ')}) - ${reason}`);
  } else {
    checks.push(`${group}: present (${names.length})`);
  }
}

function validate(group, fn) {
  const problem = fn();
  if (problem !== null) failures.push(`${group}: ${problem}`);
  else checks.push(`${group}: valid`);
}

function isHttpsUrl(name) {
  try {
    const url = new URL(env[name]);
    if (url.protocol !== 'https:') return `must use https`;
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(url.hostname)) {
      return 'must not target localhost in a deployed build';
    }
    return null;
  } catch {
    return 'is not a valid URL';
  }
}

if (scope === 'api') {
  requireNames('api-core', [
    'NODE_ENV',
    'DATABASE_URL',
    'DIRECT_URL',
    'JWT_ACCESS_SECRET',
    'ADMIN_JWT_ACCESS_SECRET',
    'CORS_ORIGINS',
  ]);

  validate('api-environment', () => {
    if (env.NODE_ENV !== 'production') return 'NODE_ENV must be production';
    for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
      try {
        const url = new URL(env[key]);
        if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
          return `${key} must be a PostgreSQL URL`;
        }
      } catch {
        return `${key} is not a valid PostgreSQL URL`;
      }
    }
    for (const key of ['JWT_ACCESS_SECRET', 'ADMIN_JWT_ACCESS_SECRET']) {
      if ((env[key] ?? '').length < 32) return `${key} must be at least 32 characters`;
      if (/replace-me|change-me|placeholder/i.test(env[key])) {
        return `${key} still contains a template placeholder`;
      }
    }
    if (env.JWT_ACCESS_SECRET === env.ADMIN_JWT_ACCESS_SECRET) {
      return 'JWT_ACCESS_SECRET and ADMIN_JWT_ACCESS_SECRET must differ';
    }
    const origins = (env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== '');
    if (origins.length === 0) return 'CORS_ORIGINS is empty';
    if (origins.some((origin) => origin === '*')) return 'CORS_ORIGINS must not use *';
    if (origins.some((origin) => !/^https:\/\//i.test(origin))) {
      return 'CORS_ORIGINS must use https in production';
    }
    const provider = (env.PROOF_STORAGE_PROVIDER ?? '').toLowerCase();
    if (provider === 'local') return 'PROOF_STORAGE_PROVIDER=local is refused in production';
    if (provider !== 's3') return 'PROOF_STORAGE_PROVIDER must be s3 in production';
    return null;
  });

  if ((env.PROOF_STORAGE_PROVIDER ?? '').toLowerCase() === 's3') {
    requireNames('api-proof-storage', [
      'PROOF_S3_BUCKET',
      'PROOF_S3_ACCESS_KEY_ID',
      'PROOF_S3_SECRET_ACCESS_KEY',
    ]);
  } else {
    requireNames('api-proof-storage', ['PROOF_STORAGE_PROVIDER']);
  }

  if ((env.AVATAR_STORAGE_PROVIDER ?? '').toLowerCase() === 's3') {
    requireNames('api-avatar-storage', [
      'AVATAR_S3_BUCKET',
      'AVATAR_S3_ACCESS_KEY_ID',
      'AVATAR_S3_SECRET_ACCESS_KEY',
      'AVATAR_PUBLIC_BASE_URL',
    ]);
  } else {
    warnings.push(
      'api-avatar-storage: not S3 - avatar uploads stay unavailable in production (feature gate)',
    );
  }

  warnMissing(
    'api-password-reset-email',
    ['PASSWORD_RESET_DELIVERY_URL'],
    'blocks live reset delivery only (#27); API still returns uniform 202',
  );
}

if (scope === 'web') {
  requireNames('web-build', ['EXPO_PUBLIC_API_URL']);
  if (has('EXPO_PUBLIC_API_URL')) {
    validate('web-build-url', () => isHttpsUrl('EXPO_PUBLIC_API_URL'));
  }
}

if (scope === 'admin') {
  requireNames('admin-build', ['NEXT_PUBLIC_API_URL']);
  if (has('NEXT_PUBLIC_API_URL')) {
    validate('admin-build-url', () => isHttpsUrl('NEXT_PUBLIC_API_URL'));
  }
}

const source = file === '' ? 'process environment' : file;
console.log(`env-presence: scope=${scope} source=${source}`);
for (const line of checks) console.log(`  PASS  ${line}`);
for (const line of warnings) console.log(`  WARN  ${line}`);
for (const line of failures) console.log(`  FAIL  ${line}`);

if (failures.length > 0) {
  console.error(`env-presence: ${failures.length} blocking problem(s); no values were printed.`);
  process.exit(1);
}
console.log('env-presence: all blocking variables present and valid.');
