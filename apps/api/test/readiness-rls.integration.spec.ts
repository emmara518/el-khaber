/**
 * REAL-POSTGRESQL regression for the readiness RLS guard.
 *
 * The public schema enables RLS with no permissive policies. A non-owner
 * role with SELECT grants therefore reads zero rows. The readiness check
 * must reject that role instead of reporting "ready".
 */

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { assessRuntimeRole, RUNTIME_ROLE_SQL } from '../src/health/readiness';

import { readTestDatabaseUrl, withTestPoolLimit } from './real-db-url';

const realDbUrl = withTestPoolLimit(readTestDatabaseUrl());
const hasRealDb = realDbUrl !== '';
const roleName = `khabir_rls_${Date.now().toString(36)}`;
const rolePassword = 'probe-password';

describe.skipIf(!hasRealDb)('readiness runtime-role contract (real PostgreSQL)', () => {
  let owner: PrismaClient;
  let probe: PrismaClient;

  beforeAll(async () => {
    owner = new PrismaClient({ datasources: { db: { url: realDbUrl } } });
    await owner.$executeRawUnsafe(
      `CREATE ROLE "${roleName}" LOGIN PASSWORD '${rolePassword}' NOSUPERUSER NOBYPASSRLS`,
    );
    await owner.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
    await owner.$executeRawUnsafe(`GRANT SELECT ON TABLE public.users TO "${roleName}"`);

    const probeUrl = new URL(realDbUrl);
    probeUrl.username = roleName;
    probeUrl.password = rolePassword;
    probeUrl.searchParams.set('connection_limit', '1');
    probe = new PrismaClient({ datasources: { db: { url: probeUrl.toString() } } });
  });

  afterAll(async () => {
    if (probe !== undefined) {
      await probe.$disconnect().catch(() => undefined);
    }
    if (owner !== undefined) {
      await owner.$executeRawUnsafe(
        `REVOKE ALL PRIVILEGES ON TABLE public.users FROM "${roleName}"`,
      ).catch(() => undefined);
      await owner.$executeRawUnsafe(
        `REVOKE ALL PRIVILEGES ON SCHEMA public FROM "${roleName}"`,
      ).catch(() => undefined);
      await owner.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`).catch(() => undefined);
      await owner.$disconnect();
    }
  });

  it('rejects an RLS-blocked runtime role and accepts the owner role', async () => {
    const ownerRows = await owner.$queryRawUnsafe<Array<Parameters<typeof assessRuntimeRole>[0]>>(
      RUNTIME_ROLE_SQL,
    );
    expect(assessRuntimeRole(ownerRows[0])).toBeNull();

    const restrictedRows = await probe.$queryRawUnsafe<
      Array<Parameters<typeof assessRuntimeRole>[0]>
    >(RUNTIME_ROLE_SQL);
    const row = restrictedRows[0];
    expect(row).toBeDefined();
    expect(row!.usersRls).toBe(true);
    expect(row!.canSelect).toBe(true);
    expect(assessRuntimeRole(row)).toContain('RLS is enabled');

    // This is the false-ready condition: the count succeeds but returns 0.
    const countRows = await probe.$queryRawUnsafe<Array<{ count: number }>>(
      'SELECT count(*)::int AS count FROM "users"',
    );
    expect(countRows[0]?.count).toBe(0);
  });
});
