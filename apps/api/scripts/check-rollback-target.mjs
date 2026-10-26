/**
 * OPS-001 guard: reject a rollback target that predates the rate-limiter fix.
 *
 * Migration 20261020091000 removes the legacy rate_limit_buckets id/updated_at
 * defaults. Images before c903e06 insert without those columns and return
 * PostgreSQL 23502 on every auth rate-limited route after that migration.
 * The rollback floor is therefore c903e06 (or any later commit).
 *
 * Usage:
 *   node scripts/check-rollback-target.mjs <git-ref>
 *
 * Exit 0: target is at or after the floor.
 * Exit 1: target is older than the floor and must not be rolled back.
 * Exit 2: missing/invalid target.
 */

import { execFileSync, spawnSync } from 'node:child_process';

const FLOOR = 'c903e0641b5067958658024ff2ce14f0f9ec0666';
const target = process.argv[2]?.trim();

if (!target) {
  console.error('Usage: node scripts/check-rollback-target.mjs <git-ref>');
  process.exit(2);
}

let sha;
try {
  sha = execFileSync('git', ['rev-parse', '--verify', `${target}^{commit}`], {
    encoding: 'utf8',
  }).trim();
} catch {
  console.error(`Rollback target is not a valid git commit: ${target}`);
  process.exit(2);
}

const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', FLOOR, sha], {
  encoding: 'utf8',
});

if (ancestor.status !== 0) {
  console.error(
    `REFUSED: ${target} (${sha}) predates the rollback floor ${FLOOR}. ` +
      'The migrated database no longer supplies rate_limit_buckets.id/updated_at defaults; ' +
      'the legacy image would return 23502 on auth routes. Deploy a build at/after the floor or restore defaults explicitly.',
  );
  process.exit(1);
}

console.log(`ACCEPTED: ${target} (${sha}) is at or after rollback floor ${FLOOR}.`);
