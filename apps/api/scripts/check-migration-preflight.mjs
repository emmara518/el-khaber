#!/usr/bin/env node
/**
 * Read-only existing-data preflight for the 27-migration chain.
 *
 * Run this against a CLONE of the target database BEFORE `prisma migrate
 * deploy`. It detects row-level conditions that would make the additive
 * constraints/indexes in the latest migrations fail, without writing data.
 *
 * It prints only check names and violation counts. The database URL and row
 * contents are never printed.
 *
 * Exit codes:
 *   0 = no blocking data conditions found
 *   1 = at least one blocking condition found
 *
 * Usage:
 *   DATABASE_URL=... node scripts/check-migration-preflight.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const failures = [];
const executed = [];

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.${table}') IS NOT NULL AS present`,
  );
  return rows[0]?.present === true;
}

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}'
     ) AS present`,
  );
  return rows[0]?.present === true;
}

async function check(name, sql, detail) {
  const rows = await prisma.$queryRawUnsafe(sql);
  const violations = Number(rows[0]?.count ?? 0);
  executed.push({ name, violations });
  if (violations > 0) {
    failures.push({ check: name, violations, detail });
  }
}

try {
  if (!(await tableExists('users'))) {
    console.log(
      JSON.stringify(
        {
          event: 'migration-preflight',
          status: 'pass',
          freshDatabase: true,
          executed: 0,
          executedChecks: [],
          checks: [],
        },
        null,
        2,
      ),
    );
    process.exitCode = 0;
  } else {
    if (await tableExists('payment_submissions')) {
      if (
        (await columnExists('payment_submissions', 'user_id')) &&
        (await columnExists('payment_submissions', 'plan_id')) &&
        (await columnExists('payment_submissions', 'transfer_reference'))
      ) {
        await check(
          'payment_submissions_duplicate_transfer_reference',
          `SELECT count(*)::int AS count FROM (
             SELECT user_id, plan_id, transfer_reference
             FROM payment_submissions
             GROUP BY user_id, plan_id, transfer_reference
             HAVING count(*) > 1
           ) duplicates`,
          'The unique (user, plan, transfer reference) index cannot be created.',
        );
      }
      if (await columnExists('payment_submissions', 'amount')) {
        await check(
          'payment_submissions_amount_negative',
          `SELECT count(*)::int AS count FROM payment_submissions WHERE amount < 0`,
          'The non-negative amount constraint would reject existing rows.',
        );
      }
      if (
        (await tableExists('subscription_plans')) &&
        (await columnExists('subscription_plans', 'price')) &&
        (await columnExists('subscription_plans', 'currency'))
      ) {
        await check(
          'payment_submissions_backfill_plan_missing',
          `SELECT count(*)::int AS count
           FROM payment_submissions ps
           LEFT JOIN subscription_plans sp ON sp.id = ps.plan_id
           WHERE sp.id IS NULL`,
          'The amount/currency snapshot backfill would leave the row unsnapshotted (plan row missing) and SET NOT NULL would reject it.',
        );
        await check(
          'payment_submissions_backfill_null_plan_price_or_currency',
          `SELECT count(*)::int AS count
           FROM payment_submissions ps
           JOIN subscription_plans sp ON sp.id = ps.plan_id
           WHERE sp.price IS NULL OR sp.currency IS NULL`,
          'The amount/currency snapshot backfill would copy NULL and SET NOT NULL would reject the row.',
        );
      }
    }

    if (
      (await tableExists('conversations')) &&
      (await columnExists('conversations', 'product_id')) &&
      (await columnExists('conversations', 'initiator_user_id'))
    ) {
      await check(
        'conversations_product_initiator_null',
        `SELECT count(*)::int AS count FROM conversations
         WHERE product_id IS NOT NULL AND initiator_user_id IS NULL`,
        'Product conversations need an initiator before the NOT NULL check is added.',
      );
      await check(
        'conversations_initiator_missing_user',
        `SELECT count(*)::int AS count FROM conversations c
         LEFT JOIN users u ON u.id = c.initiator_user_id
         WHERE c.initiator_user_id IS NOT NULL AND u.id IS NULL`,
        'The initiator foreign key cannot be added while dangling ids exist.',
      );
    }

    if (
      (await tableExists('service_requests')) &&
      (await tableExists('services')) &&
      (await columnExists('service_requests', 'service_id'))
    ) {
      await check(
        'service_requests_service_category_mismatch',
        `SELECT count(*)::int AS count
         FROM service_requests sr
         JOIN services s ON s.id = sr.service_id
         WHERE sr.service_id IS NOT NULL
           AND s.appliance_category_id <> sr.appliance_category_id`,
        'The composite service/category foreign key cannot be added.',
      );
    }
    if (
      (await tableExists('service_requests')) &&
      (await tableExists('faults')) &&
      (await columnExists('service_requests', 'fault_id'))
    ) {
      await check(
        'service_requests_fault_category_mismatch',
        `SELECT count(*)::int AS count
         FROM service_requests sr
         JOIN faults f ON f.id = sr.fault_id
         WHERE sr.fault_id IS NOT NULL
           AND f.appliance_category_id <> sr.appliance_category_id`,
        'The composite fault/category foreign key cannot be added.',
      );
    }

    if (await tableExists('service_requests')) {
      await check(
        'service_requests_estimated_price_negative',
        `SELECT count(*)::int AS count FROM service_requests
         WHERE estimated_price_from < 0 OR estimated_price_to < 0 OR final_price < 0`,
        'The non-negative price constraint would reject existing rows.',
      );
      await check(
        'service_requests_estimated_price_order',
        `SELECT count(*)::int AS count FROM service_requests
         WHERE estimated_price_from IS NOT NULL
           AND estimated_price_to IS NOT NULL
           AND estimated_price_from > estimated_price_to`,
        'The price-order constraint would reject existing rows.',
      );
      await check(
        'service_requests_status_timestamps',
        `SELECT count(*)::int AS count FROM service_requests
         WHERE (status = 'accepted' AND accepted_at IS NULL)
            OR (status = 'on_the_way' AND (accepted_at IS NULL OR started_at IS NULL))
            OR (status = 'in_progress' AND started_at IS NULL)
            OR (status = 'completed' AND completed_at IS NULL)
            OR (status = 'cancelled' AND cancelled_at IS NULL)`,
        'The status/timestamp invariant would reject existing rows.',
      );
    }

    if ((await tableExists('products')) && (await columnExists('products', 'price'))) {
      await check(
        'products_price_negative',
        `SELECT count(*)::int AS count FROM products WHERE price < 0`,
        'The non-negative product price constraint would reject existing rows.',
      );
    }

    if (
      (await tableExists('technician_services')) &&
      (await columnExists('technician_services', 'price_from'))
    ) {
      await check(
        'technician_services_price_from_negative',
        `SELECT count(*)::int AS count FROM technician_services WHERE price_from < 0`,
        'The non-negative price_from constraint would reject existing rows.',
      );
    }

    if ((await tableExists('locations')) && (await columnExists('locations', 'latitude'))) {
      await check(
        'locations_coordinate_pair',
        `SELECT count(*)::int AS count FROM locations
         WHERE (latitude IS NULL) <> (longitude IS NULL)`,
        'The coordinate-pair check would reject existing half-coordinate rows.',
      );
      await check(
        'locations_coordinate_range',
        `SELECT count(*)::int AS count FROM locations
         WHERE (latitude IS NOT NULL AND (latitude < -90 OR latitude > 90))
            OR (longitude IS NOT NULL AND (longitude < -180 OR longitude > 180))`,
        'The coordinate-range check would reject existing out-of-range rows.',
      );
    }

    if (
      (await tableExists('technician_service_areas')) &&
      (await columnExists('technician_service_areas', 'latitude'))
    ) {
      await check(
        'technician_service_areas_coordinate_pair',
        `SELECT count(*)::int AS count FROM technician_service_areas
         WHERE (latitude IS NULL) <> (longitude IS NULL)`,
        'The coordinate-pair check would reject existing half-coordinate rows.',
      );
      await check(
        'technician_service_areas_coordinate_range',
        `SELECT count(*)::int AS count FROM technician_service_areas
         WHERE (latitude IS NOT NULL AND (latitude < -90 OR latitude > 90))
            OR (longitude IS NOT NULL AND (longitude < -180 OR longitude > 180))`,
        'The coordinate-range check would reject existing out-of-range rows.',
      );
    }

    const databaseRows = await prisma.$queryRawUnsafe(
      `SELECT current_database() AS name, current_user AS role, current_setting('server_version') AS version`,
    );
    const report = {
      event: 'migration-preflight',
      status: failures.length === 0 ? 'pass' : 'fail',
      database: databaseRows[0]?.name ?? 'unknown',
      serverRole: databaseRows[0]?.role ?? 'unknown',
      serverVersion: databaseRows[0]?.version ?? 'unknown',
      executed: executed.length,
      executedChecks: executed,
      checks: failures,
    };
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = failures.length === 0 ? 0 : 1;
  }
} finally {
  await prisma.$disconnect();
}
