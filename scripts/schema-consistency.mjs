#!/usr/bin/env node
/**
 * Schema/migrations consistency gate.
 *
 * Compares the migrated database with prisma/schema.prisma. The only
 * accepted differences are the two PostGIS GIST indexes on
 * `coordinates` columns: Prisma 5 cannot express a GIST index over an
 * `Unsupported("geography")` column, so those indexes exist only in
 * migrations and must be preserved.
 *
 * Any other difference fails. When a new accepted difference is truly
 * unavoidable, update apps/api/prisma/schema-drift-baseline.sql in the
 * same PR with a written justification in the PR description.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = resolve(root, 'apps/api/prisma/schema-drift-baseline.sql');

const databaseUrl = process.env['DATABASE_URL'] ?? '';
if (databaseUrl === '') {
  console.error('schema-consistency: DATABASE_URL is required.');
  process.exit(1);
}

const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
let diff;
try {
  diff = execFileSync(
    command,
    [
      '--filter',
      '@khabir/api',
      'exec',
      'prisma',
      'migrate',
      'diff',
      '--from-url',
      databaseUrl,
      '--to-schema-datamodel',
      'prisma/schema.prisma',
      '--script',
    ],
    {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024,
      shell: process.platform === 'win32',
    },
  );
} catch (error) {
  console.error('schema-consistency: prisma migrate diff failed.');
  if (error.stderr) console.error(String(error.stderr));
  process.exit(1);
}

const normalize = (sql) =>
  sql
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('--'))
    .join('\n');

const actual = normalize(diff);
const expected = normalize(readFileSync(baselinePath, 'utf8'));

if (actual !== expected) {
  console.error('Schema/migrations drift detected.');
  console.error('--- expected (reviewed baseline) ---');
  console.error(expected === '' ? '<none>' : expected);
  console.error('--- actual ---');
  console.error(actual === '' ? '<none>' : actual);
  console.error(
    'Add a migration/schema fix, or update the baseline only with an explicit justification.',
  );
  process.exit(1);
}

console.log('Schema/migrations consistency check passed.');
