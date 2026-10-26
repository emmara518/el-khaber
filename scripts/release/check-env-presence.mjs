#!/usr/bin/env node
/**
 * Presence-only environment check for the authorized UAT target.
 *
 * Reports MISSING NAMES and validation failures. It never prints a value,
 * so it is safe to run in CI logs and release evidence.
 *
 *   node scripts/release/check-env-presence.mjs --scope api --file apps/api/.env
 *   node scripts/release/check-env-presence.mjs --scope api --require-feature proof
 *   node scripts/release/check-env-presence.mjs --scope web          # process.env
 *
 * Scope:
 *   api   - startup/deploy variables plus feature-gated storage/email
 *   web   - EXPO_PUBLIC_API_URL baked into the exported web app
 *   admin - NEXT_PUBLIC_API_URL baked into the admin build
 *
 * Feature gates (proof|email|avatar) are WARN by default. Pass
 * `--require-feature proof` when the release claims the payment-proof flow,
 * which makes that feature blocking. Core startup variables always block.
 *
 * Exit code 1 when a blocking variable is missing or fails validation.
 * Values are never printed.
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

const FEATURES = new Set(['proof', 'email', 'avatar']);
const requiredFeatures = new Set(
  arg('require-feature', '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== ''),
);
for (const feature of requiredFeatures) {
  if (!FEATURES.has(feature)) {
    console.error(`Invalid --require-feature '${feature}' (proof|email|avatar)`);
    process.exit(2);
  }
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

/**
 * Feature-only configuration: BLOCK only when the caller explicitly includes
 * the feature in --require-feature (e.g. payments are in the UAT scope).
 * Otherwise it is reported as a WARN so a deploy is not silently blocked by a
 * feature the release does not claim to include.
 */
function featureProblem(feature, message) {
  if (requiredFeatures.has(feature)) failures.push(`${message} [required feature: ${feature}]`);
  else warnings.push(`${message} [feature: ${feature}]`);
}

function featureOk(feature, message) {
  checks.push(`${message} [feature: ${feature}]`);
}

function validate(group, fn) {
  const problem = fn();
  if (problem !== null) failures.push(`${group}: ${problem}`);
  else checks.push(`${group}: valid`);
}

function isHttpsUrl(name, options = {}) {
  try {
    const url = new URL(env[name]);
    if (url.protocol !== 'https:') return `must use https`;
    if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(url.hostname)) {
      return 'must not target localhost in a deployed build';
    }
    if (options.requireApiPrefix === true) {
      const path = url.pathname.replace(/\/+$/, '');
      if (!path.endsWith('/api/v1')) {
        return 'must include the /api/v1 prefix (the mobile client does not append it)';
      }
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
    return null;
  });

  const proofProvider = (env.PROOF_STORAGE_PROVIDER ?? '').toLowerCase();
  if (proofProvider === 's3') {
    const missing = [
      'PROOF_S3_BUCKET',
      'PROOF_S3_ACCESS_KEY_ID',
      'PROOF_S3_SECRET_ACCESS_KEY',
    ].filter((name) => !has(name));
    if (missing.length > 0) {
      featureProblem(
        'proof',
        `api-proof-storage: missing ${missing.join(', ')} - payment proof uploads fail closed`,
      );
    } else {
      featureOk('proof', 'api-proof-storage: s3 credentials present');
    }
  } else if (env.NODE_ENV === 'production') {
    featureProblem(
      'proof',
      `api-proof-storage: PROOF_STORAGE_PROVIDER must be s3 in production (got '${proofProvider || 'unset'}')`,
    );
  } else {
    featureProblem(
      'proof',
      'api-proof-storage: local adapter is not valid for a deployed UAT target',
    );
  }

  const avatarProvider = (env.AVATAR_STORAGE_PROVIDER ?? '').toLowerCase();
  if (avatarProvider === 's3') {
    const missing = [
      'AVATAR_S3_BUCKET',
      'AVATAR_S3_ACCESS_KEY_ID',
      'AVATAR_S3_SECRET_ACCESS_KEY',
      'AVATAR_PUBLIC_BASE_URL',
    ].filter((name) => !has(name));
    if (missing.length > 0) {
      featureProblem(
        'avatar',
        `api-avatar-storage: missing ${missing.join(', ')} - avatar uploads fail closed`,
      );
    } else {
      featureOk('avatar', 'api-avatar-storage: s3 credentials present');
    }
  } else {
    featureProblem(
      'avatar',
      'api-avatar-storage: not S3 - avatar uploads remain unavailable on the deployed target',
    );
  }

  if (has('PASSWORD_RESET_DELIVERY_URL')) {
    featureOk('email', 'api-password-reset-email: delivery webhook present');
  } else {
    featureProblem(
      'email',
      'api-password-reset-email: missing PASSWORD_RESET_DELIVERY_URL - no reset email is delivered (#27)',
    );
  }
}

if (scope === 'web') {
  requireNames('web-build', ['EXPO_PUBLIC_API_URL']);
  if (has('EXPO_PUBLIC_API_URL')) {
    validate('web-build-url', () => isHttpsUrl('EXPO_PUBLIC_API_URL', { requireApiPrefix: true }));
  }
}

if (scope === 'admin') {
  requireNames('admin-build', ['NEXT_PUBLIC_API_URL']);
  if (has('NEXT_PUBLIC_API_URL')) {
    validate('admin-build-url', () => isHttpsUrl('NEXT_PUBLIC_API_URL'));
  }
}

const source = file === '' ? 'process environment' : file;
const features = [...requiredFeatures].join(',') || 'none';
console.log(`env-presence: scope=${scope} source=${source} required-features=${features}`);
for (const line of checks) console.log(`  PASS  ${line}`);
for (const line of warnings) console.log(`  WARN  ${line}`);
for (const line of failures) console.log(`  FAIL  ${line}`);

if (failures.length > 0) {
  console.error(`env-presence: ${failures.length} blocking problem(s); no values were printed.`);
  process.exit(1);
}
console.log(
  warnings.length > 0
    ? 'env-presence: core deployment variables present; feature warnings remain (see above).'
    : 'env-presence: all blocking variables present and valid.',
);
