#!/usr/bin/env node
/**
 * Backfill technician_profiles.completed_services_count from the
 * authoritative service_requests rows.
 *
 * The normal completion transition and the admin override both maintain the
 * counter transactionally. This script repairs historical rows created before
 * that fix. It is read-only by default; pass --apply to write the corrected
 * counts. It prints only aggregate counts and never prints the database URL.
 *
 * Usage:
 *   node scripts/backfill-completed-services.mjs
 *   node scripts/backfill-completed-services.mjs --apply
 */

import { PrismaClient } from '@prisma/client';

const apply = process.argv.includes('--apply');
const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      tp."id" AS id,
      tp."completed_services_count" AS stored,
      COALESCE(sr.completed, 0)::int AS actual
    FROM "technician_profiles" tp
    LEFT JOIN (
      SELECT "technician_id", count(*)::int AS completed
      FROM "service_requests"
      WHERE "status" = 'completed' AND "technician_id" IS NOT NULL
      GROUP BY "technician_id"
    ) sr ON sr."technician_id" = tp."id"
    WHERE tp."completed_services_count" <> COALESCE(sr.completed, 0)
    ORDER BY tp."id"
  `);

  const mismatches = rows.length;
  let updated = 0;

  if (apply) {
    for (const row of rows) {
      updated += await prisma.$executeRaw`
        UPDATE "technician_profiles"
        SET "completed_services_count" = ${row.actual}
        WHERE "id" = ${row.id}::uuid
      `;
    }
  }

  console.log(
    JSON.stringify(
      {
        event: 'backfill-completed-services',
        mode: apply ? 'apply' : 'dry-run',
        mismatches,
        updated,
      },
      null,
      2,
    ),
  );

  if (!apply && mismatches > 0) {
    console.log('Run with --apply to write the corrected counts.');
  }
} finally {
  await prisma.$disconnect();
}
