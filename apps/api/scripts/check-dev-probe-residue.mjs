#!/usr/bin/env node
/**
 * READ-ONLY residue check for the khabir-dev incident.
 *
 * It loads apps/api/.env (the development connection), refuses anything that
 * is not a Supabase dev target, then runs COUNT queries only. It NEVER
 * deletes, updates, or inserts. No credentials or connection strings are
 * printed.
 *
 * Run from apps/api:
 *   ALLOW_DEV_READONLY_CHECK=true node scripts/check-dev-probe-residue.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import { parse } from 'dotenv';

const here = dirname(fileURLToPath(import.meta.url));

if (process.env.ALLOW_DEV_READONLY_CHECK !== 'true') {
  throw new Error('Set ALLOW_DEV_READONLY_CHECK=true for this read-only check.');
}

const envPath = join(here, '..', '.env');
const parsed = parse(readFileSync(envPath, 'utf8'));
const url = parsed.DATABASE_URL ?? '';
if (url === '') throw new Error('DATABASE_URL is missing from apps/api/.env.');

let host = '';
let database = '';
try {
  const u = new URL(url);
  host = u.hostname.toLowerCase();
  database = u.pathname.replace(/^\//, '');
} catch {
  throw new Error('DATABASE_URL in apps/api/.env is not a valid URL.');
}
if (!/supabase\.(com|co|in)/i.test(host)) {
  throw new Error('Refusing: apps/api/.env does not point at Supabase (dev target expected).');
}
if (/prod/i.test(host) || /prod/i.test(database)) {
  throw new Error('Refusing: the configured target looks like production.');
}
console.log(`Target: Supabase dev database (host redacted), database=${database}`);

const prisma = new PrismaClient({ datasources: { db: { url } } });

const checks = [
  ['users.email', 'SELECT count(*)::int AS n FROM users WHERE email LIKE $1', ['t10%-probe%']],
  ['admin_users.email', 'SELECT count(*)::int AS n FROM admin_users WHERE email LIKE $1', ['t10%-probe%']],
  [
    'service_requests.problem',
    'SELECT count(*)::int AS n FROM service_requests WHERE problem_title LIKE $1 OR problem_description LIKE $1',
    ['t10%-probe%'],
  ],
  [
    'technician_profiles.display_name',
    "SELECT count(*)::int AS n FROM technician_profiles WHERE display_name LIKE $1 OR display_name LIKE 't10er1%'",
    ['t10%-probe%'],
  ],
  ['locations.label', 'SELECT count(*)::int AS n FROM locations WHERE label LIKE $1', ['t10%-probe%']],
  [
    'merchant_profiles.business_name',
    'SELECT count(*)::int AS n FROM merchant_profiles WHERE business_name LIKE $1',
    ['t10%-probe%'],
  ],
  ['products', 'SELECT count(*)::int AS n FROM products WHERE name_ar LIKE $1 OR slug LIKE $1 OR description_ar LIKE $1', ['%t10%-probe%']],
  ['reviews.comment', 'SELECT count(*)::int AS n FROM reviews WHERE comment LIKE $1', ['%t10%-probe%']],
  ['messages.body', 'SELECT count(*)::int AS n FROM messages WHERE body LIKE $1', ['%t10%-probe%']],
  ['notifications.body_ar', 'SELECT count(*)::int AS n FROM notifications WHERE body_ar LIKE $1', ['%t10%-probe%']],
  [
    'payment_submissions.transfer_reference',
    'SELECT count(*)::int AS n FROM payment_submissions WHERE transfer_reference LIKE $1',
    ['t10%-probe%'],
  ],
  [
    'subscription_plans.code',
    'SELECT count(*)::int AS n FROM subscription_plans WHERE code LIKE $1',
    ['t10%-probe%'],
  ],
  [
    'entitlements.code',
    'SELECT count(*)::int AS n FROM entitlements WHERE code LIKE $1',
    ['t10%-probe%'],
  ],
  ['audit_logs.after_json', "SELECT count(*)::int AS n FROM audit_logs WHERE after_json::text LIKE $1", ['%t10%-probe%']],
];

let total = 0;
try {
  for (const [label, sql, params] of checks) {
    try {
      const rows = await prisma.$queryRawUnsafe(sql, ...params);
      const count = Number(rows?.[0]?.n ?? 0);
      total += count;
      console.log(`${label}: ${String(count)}`);
    } catch (error) {
      console.log(`${label}: CHECK_FAILED (${error instanceof Error ? error.message.split('\n')[0] : 'unknown'})`);
    }
  }
  console.log(`TOTAL_RESIDUE_ROWS=${String(total)}`);
} finally {
  await prisma.$disconnect();
}
