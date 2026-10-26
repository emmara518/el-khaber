/**
 * DB-001 preflight: prove the runtime database role can operate against the
 * RLS-enabled public schema.
 *
 * The schema enables RLS with no permissive policies. A non-owner role
 * without BYPASSRLS would see zero rows and fail every write. The accepted
 * deployment contract is therefore:
 *
 *   runtime role is the table owner (and FORCE RLS is off), OR
 *   runtime role is a dedicated role with BYPASSRLS and DML privileges.
 *
 * This script prints only role/ownership flags and table privileges. It
 * never prints the connection URL, password, or row contents.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/check-runtime-db-role.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      current_user AS current_user,
      r.rolsuper,
      r.rolbypassrls,
      pg_get_userbyid(c.relowner) AS users_owner,
      c.relrowsecurity AS users_rls,
      c.relforcerowsecurity AS users_force_rls,
      has_table_privilege(current_user, 'public.users', 'SELECT,INSERT') AS can_dml
    FROM pg_roles r
    JOIN pg_class c ON c.relname = 'users'
      AND c.relnamespace = 'public'::regnamespace
    WHERE r.rolname = current_user
  `);

  const timezoneRows = await prisma.$queryRawUnsafe('SHOW timezone');
  const timezone = timezoneRows[0]?.TimeZone ?? timezoneRows[0]?.timezone ?? 'unknown';

  const row = rows[0];
  if (row === undefined) {
    throw new Error('Could not resolve the runtime role against public.users.');
  }

  const ownsUsers = row.users_owner === row.current_user;
  const ownerBypassesRls = ownsUsers && row.users_force_rls === false;
  const accepted = ownerBypassesRls || row.rolbypassrls === true;

  console.log(
    JSON.stringify(
      {
        event: 'runtime-db-role-check',
        currentUser: row.current_user,
        usersOwner: row.users_owner,
        ownsUsers,
        rolsuper: row.rolsuper,
        rolbypassrls: row.rolbypassrls,
        usersRls: row.users_rls,
        usersForceRls: row.users_force_rls,
        canDml: row.can_dml,
        sessionTimezone: timezone,
        accepted,
      },
      null,
      2,
    ),
  );

  if (!row.can_dml) {
    throw new Error('Runtime role lacks SELECT/INSERT on public.users.');
  }
  if (timezone !== 'UTC' && timezone !== 'Etc/UTC') {
    throw new Error(
      `Database session timezone is '${timezone}', expected UTC/Etc/UTC; business timestamps are naive.`,
    );
  }
  if (!accepted) {
    throw new Error(
      'Runtime role is neither the table owner (with FORCE RLS off) nor a BYPASSRLS role. ' +
        'It would see zero rows under the no-policy RLS setup. Use the owner/BYPASSRLS contract ' +
        'documented in docs/local-dev.md or add explicit RLS policies before deploying.',
    );
  }
} finally {
  await prisma.$disconnect();
}
