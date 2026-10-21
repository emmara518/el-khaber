#!/usr/bin/env node
/**
 * migrate-deploy.mjs — production migration gate (AUD-003).
 *
 * Runs `prisma migrate deploy` as a hard, fail-closed step before the API
 * starts. Designed to be invoked from the Docker CMD and from Render's
 * pre-deploy command once a paid plan is used (pre-endpoint free plans do
 * NOT support preDeployCommand — see docs/14_PRODUCTION_DEPLOY_RUNBOOK.md).
 *
 * Design rules:
 *  - Fail closed: every missing precondition exits non-zero BEFORE any DB
 *    contact; a failed `migrate deploy` propagates non-zero so the deploy
 *    is refused and the previous version stays live (Render zero-downtime
 *    semantics).
 *  - Never log secret values. Connection strings are only ever reported
 *    as `set`/`missing`.
 *  - No dependencies beyond the workspace: uses the Prisma CLI that is
 *    already installed via apps/api dependencies (prisma@5.22.0).
 *  - Prisma CLI automatically applies migrations over the `directUrl`
 *    datasource (docs/adr/0004-supabase-postgres.md): the pooled
 *    DATABASE_URL is never used for DDL.
 *
 * Usage:
 *   node scripts/migrate-deploy.mjs              # run migrations
 *   node scripts/migrate-deploy.mjs --preflight  # validate preconditions only
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const TAG = '[migrate-deploy]';
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.resolve(SCRIPT_DIR, '..');
const SCHEMA_PATH = path.join(API_DIR, 'prisma', 'schema.prisma');
const MIGRATIONS_DIR = path.join(API_DIR, 'prisma', 'migrations');
const PRISMA_CLI_ENTRY = path.join(API_DIR, 'node_modules', 'prisma', 'build', 'index.js');
const DEFAULT_TIMEOUT_SECONDS = 900;

let preflight = false;
const args = process.argv.slice(2);
if (args.includes('--preflight')) {
  preflight = true;
} else if (args.length > 0) {
  console.error(`${TAG} unknown argument(s): ${args.join(' ')}`);
  console.error(`${TAG} usage: node scripts/migrate-deploy.mjs [--preflight]`);
  process.exit(2);
}

function die(message) {
  console.error(`${TAG} FAIL fatal: ${message}`);
  process.exit(1);
}

function envStatus(name) {
  const raw = process.env[name];
  return raw !== undefined && raw.trim() !== '' ? 'set' : 'missing';
}

function readTimeoutSeconds() {
  const raw = process.env.MIGRATE_DEPLOY_TIMEOUT_SECONDS;
  if (raw === undefined || raw.trim() === '') {
    return DEFAULT_TIMEOUT_SECONDS;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_TIMEOUT_SECONDS;
  }
  return parsed;
}

function collectMigrations() {
  if (!existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => statSync(path.join(MIGRATIONS_DIR, name)).isDirectory())
    .sort();
}

// ---------------------------------------------------------------------------
// Preflight — no DB contact at all.
// ---------------------------------------------------------------------------

const migrations = collectMigrations();

console.log(`${TAG} node ${process.version}`);
console.log(`${TAG} schema: ${path.relative(API_DIR, SCHEMA_PATH)} ${existsSync(SCHEMA_PATH) ? 'ok' : 'MISSING'}`);
console.log(`${TAG} prisma CLI: ${existsSync(PRISMA_CLI_ENTRY) ? 'found' : 'MISSING'}`);
console.log(`${TAG} DATABASE_URL: ${envStatus('DATABASE_URL')}`);
console.log(`${TAG} DIRECT_URL: ${envStatus('DIRECT_URL')} (used automatically by the CLI for migrate commands)`);
console.log(`${TAG} migrations: ${migrations.length} pending-eligible (${migrations.slice(-3).join(', ') || 'none'})`);

for (const check of [
  existsSync(SCHEMA_PATH) ? null : 'prisma/schema.prisma not found',
  existsSync(PRISMA_CLI_ENTRY) ? null : 'prisma CLI not (fully) installed in apps/api/node_modules',
  envStatus('DATABASE_URL') === 'set' ? null : 'DATABASE_URL is not set',
  envStatus('DIRECT_URL') === 'set' ? null : 'DIRECT_URL is not set (migrations must run over the direct connection)',
  migrations.length > 0 ? null : 'no migrations directory content found',
]) {
  if (check) {
    die(check);
  }
}

if (preflight) {
  console.log(`${TAG} preflight OK (no DB contacted, no migrations applied)`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Run — `prisma migrate deploy` over the direct connection, fail-closed.
// ---------------------------------------------------------------------------

const timeoutMs = readTimeoutSeconds() * 1000;
console.log(`${TAG} running: prisma migrate deploy (timeout ${Math.round(timeoutMs / 1000)}s)`);

const child = spawn(process.execPath, [PRISMA_CLI_ENTRY, 'migrate', 'deploy'], {
  cwd: API_DIR,
  env: process.env,
  stdio: 'inherit',
});

const timer = setTimeout(() => {
  console.error(`${TAG} FAIL timed out after ${Math.round(timeoutMs / 1000)}s — killing migrate deploy`);
  child.kill('SIGKILL');
}, timeoutMs);

child.on('exit', (code, signal) => {
  clearTimeout(timer);
  if (signal) {
    console.error(`${TAG} FAIL terminated by signal ${signal}`);
    process.exit(1);
  }
  if (code !== 0) {
    console.error(`${TAG} FAIL migrate deploy exited with code ${code} — deploy must not proceed`);
    process.exit(code ?? 1);
  }
  console.log(`${TAG} OK migrations applied/converged`);
  process.exit(0);
});

child.on('error', (err) => {
  clearTimeout(timer);
  die(`could not spawn prisma CLI: ${err.message}`);
});
