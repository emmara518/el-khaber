/**
 * REAL-DATABASE integration tests for the technician service-area
 * foundation (Task 10E-R1).
 *
 * These tests REQUIRE the verified khabir-dev Supabase connection and
 * are the INVERSE of the FakePrisma e2e guard: they SKIP when no real
 * DATABASE_URL is configured and must never run against anything but
 * the managed dev project.
 *
 * IMPORTANT: the connection string is read from apps/api/.env WITHOUT
 * mutating process.env (the FakePrisma e2e DB-safety guard pins
 * process.env.DATABASE_URL at config level; mutating it here would leak
 * across worker-shared spec files).
 *
 * Every data probe runs inside a transaction that is rolled back, so
 * the suite leaves ZERO persistent rows (deterministic + cleanable).
 */

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Parse .env WITHOUT touching process.env (dotenv.parse only): the
// FakePrisma e2e DB-safety guard pins process.env.DATABASE_URL at config
// level; mutating it here would leak across worker-shared spec files.
const envPath = join(__dirname, '..', '.env');
let realDbUrl = '';
try {
  const parsed = parse(readFileSync(envPath, 'utf8')) as Record<string, string>;
  realDbUrl = parsed['DATABASE_URL'] ?? '';
} catch {
  realDbUrl = '';
}

const hasRealDb = /supabase\.com|supabase\.co/i.test(realDbUrl);

describe.skipIf(!hasRealDb)('technician service-area schema (real khabir-dev)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    if (!hasRealDb) {
      return;
    }
    prisma = new PrismaClient({ datasources: { db: { url: realDbUrl } } });
  });

  it('exposes the approved indexes (service_id + service-area FK + GiST)', async () => {
    const idx = (await prisma.$queryRawUnsafe(
      "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND (indexname LIKE 'technician_service_areas%' OR indexname = 'technician_services_service_id_idx')",
    )) as Array<{ indexname: string }>;
    const names = idx.map((i) => i.indexname);
    expect(names).toContain('technician_services_service_id_idx');
    expect(names).toContain('technician_service_areas_technician_id_idx');
    expect(names).toContain('technician_service_areas_coordinates_gist');
    await prisma.$disconnect();
  });

  it('registers coordinates as geography(Point, 4326)', async () => {
    const geo = (await prisma.$queryRawUnsafe(
      "SELECT type, srid FROM geography_columns WHERE f_table_name='technician_service_areas' AND f_geography_column='coordinates'",
    )) as Array<{ type: string; srid: number }>;
    expect(geo).toHaveLength(1);
    expect(geo[0]?.type).toBe('Point');
    expect(geo[0]?.srid).toBe(4326);
    await prisma.$disconnect();
  });

  it('supports multiple areas per technician, rejects duplicates, and isolates technicians (rolled back)', async () => {
    let probeError: unknown;
    await prisma
      .$transaction(async (tx) => {
        // Minimal deterministic identity inside the transaction (rolled back).
        await tx.$executeRawUnsafe(
          "INSERT INTO users (phone, password_hash, role, status) VALUES ('+15551000001', 'probe', 'technician', 'active'), ('+15551000002', 'probe', 'technician', 'active')",
        );
        await tx.$executeRawUnsafe(
          "INSERT INTO technician_profiles (user_id, display_name) SELECT id, 't10er1-a' FROM users WHERE phone = '+15551000001'",
        );
        await tx.$executeRawUnsafe(
          "INSERT INTO technician_profiles (user_id, display_name) SELECT id, 't10er1-b' FROM users WHERE phone = '+15551000002'",
        );
        const profiles = (await tx.$queryRawUnsafe(
          'SELECT id FROM technician_profiles WHERE display_name IN ($1, $2) ORDER BY display_name',
          't10er1-a',
          't10er1-b',
        )) as Array<{ id: string }>;
        const techA = profiles[0]?.id as string;
        const techB = profiles[1]?.id as string;

        // A technician may have MULTIPLE service areas.
        await tx.$executeRawUnsafe(
          'INSERT INTO technician_service_areas (technician_id, label_ar, latitude, longitude) VALUES ($1::uuid, $2, $3, $4), ($1::uuid, $5, $6, $7)',
          techA,
          'حي الملقا',
          24.79,
          46.62,
          'حي النرجس',
          24.83,
          46.65,
        );
        const areas = (await tx.$queryRawUnsafe(
          'SELECT label_ar, ST_Y(coordinates::geometry) AS lat, ST_X(coordinates::geometry) AS lng FROM technician_service_areas WHERE technician_id = $1::uuid ORDER BY label_ar',
          techA,
        )) as Array<{ label_ar: string; lat: number; lng: number }>;
        expect(areas).toHaveLength(2);
        expect(areas[0]?.label_ar).toBe('حي الملقا');
        // Coordinates are DERIVED from latitude/longitude (single truth).
        expect(areas[1]?.lat).toBeCloseTo(24.83, 5);
        expect(areas[1]?.lng).toBeCloseTo(46.65, 5);

        // Duplicate service-area prevention (same technician + label).
        // The failing INSERT aborts the transaction, so it is wrapped in
        // a SAVEPOINT that is rolled back immediately afterwards.
        await tx.$executeRawUnsafe('SAVEPOINT dup_probe');
        let rejected = false;
        try {
          await tx.$executeRawUnsafe(
            'INSERT INTO technician_service_areas (technician_id, label_ar, latitude, longitude) VALUES ($1::uuid, $2, $3, $4)',
            techA,
            'حي النرجس',
            24.9,
            46.7,
          );
        } catch {
          rejected = true;
        }
        await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT dup_probe');
        expect(rejected).toBe(true);

        // Technician isolation: B has no service areas.
        const bAreas = (await tx.$queryRawUnsafe(
          'SELECT COUNT(*)::int AS n FROM technician_service_areas WHERE technician_id = $1::uuid',
          techB,
        )) as Array<{ n: number }>;
        expect(bAreas[0]?.n).toBe(0);

        throw new Error('ROLLBACK_PROBE');
      })
      .catch((error: unknown) => {
        probeError = error;
      });

    expect(
      probeError instanceof Error ? probeError.message : String(probeError),
    ).toContain('ROLLBACK_PROBE');

    // Zero persistent residue.
    const residue = (await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int AS n FROM technician_service_areas',
    )) as Array<{ n: number }>;
    expect(residue[0]?.n).toBe(0);
    const profiles = (await prisma.$queryRawUnsafe(
      "SELECT COUNT(*)::int AS n FROM technician_profiles WHERE display_name LIKE 't10er1-%'",
    )) as Array<{ n: number }>;
    expect(profiles[0]?.n).toBe(0);
    await prisma.$disconnect();
  });
});
