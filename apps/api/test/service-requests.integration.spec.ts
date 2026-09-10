/**
 * REAL-DATABASE integration tests for Service Request concurrency
 * (Task 10F §9, §21): the atomic accept must allow EXACTLY ONE winner
 * under PostgreSQL row locking; the loser receives count=0 with no
 * second mutation.
 *
 * Same contract as technician-service-areas.integration.spec.ts:
 * requires the verified khabir-dev connection (skips otherwise), reads
 * .env WITHOUT mutating process.env, and cleans every probe row
 * (deterministic markers `t10f-probe`).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'dotenv';
import { PrismaClient } from '@prisma/client';

const envPath = join(__dirname, '..', '.env');
let realDbUrl = '';
try {
  const parsed = parse(readFileSync(envPath, 'utf8')) as Record<string, string>;
  realDbUrl = parsed['DATABASE_URL'] ?? '';
} catch {
  realDbUrl = '';
}
const hasRealDb = /supabase\.com|supabase\.co/i.test(realDbUrl);

const PROBE = 't10f-probe';

describe.skipIf(!hasRealDb)('service request concurrency (real khabir-dev)', () => {
  let prisma: PrismaClient;
  let requestId = '';
  let techProfileId = '';
  let techUserId = '';

  beforeAll(async () => {
    if (!hasRealDb) {
      return;
    }
    prisma = new PrismaClient({ datasources: { db: { url: realDbUrl } } });
    await cleanProbeRows();
  });

  afterAll(async () => {
    if (!hasRealDb) {
      return;
    }
    await cleanProbeRows();
    await prisma.$disconnect();
  });

  async function cleanProbeRows(): Promise<void> {
    // service_requests.customer_id is ON DELETE RESTRICT (10B design), so
    // probe REQUESTS are removed before their probe users; profiles,
    // locations, tokens, and history cascade from the users.
    await prisma.serviceRequest.deleteMany({
      where: {
        OR: [
          { customer: { email: { startsWith: `${PROBE}-` } } },
          { technician: { user: { email: { startsWith: `${PROBE}-` } } } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: `${PROBE}-` } } });
  }

  async function seedProbe(): Promise<void> {
    const customer = await prisma.user.create({
      data: { email: `${PROBE}-cust@example.com`, passwordHash: 'probe', role: 'customer', status: 'active' },
    });
    const technician = await prisma.user.create({
      data: { email: `${PROBE}-tech@example.com`, passwordHash: 'probe', role: 'technician', status: 'active' },
    });
    const profile = await prisma.technicianProfile.create({
      data: { userId: technician.id, displayName: PROBE, verificationStatus: 'verified' },
    });
    techProfileId = profile.id;
    techUserId = technician.id;
    const location = await prisma.location.create({
      data: { userId: customer.id, label: PROBE, latitude: 24.7, longitude: 46.7 },
    });
    const request = await prisma.serviceRequest.create({
      data: {
        customerId: customer.id,
        technicianId: profile.id,
        applianceCategoryId: (
          await prisma.applianceCategory.findFirstOrThrow({ select: { id: true } })
        ).id,
        status: 'pending',
        problemTitle: PROBE,
        problemDescription: PROBE,
        locationId: location.id,
      },
    });
    requestId = request.id;
    await prisma.serviceRequestStatusHistory.create({
      data: { serviceRequestId: requestId, fromStatus: null, toStatus: 'pending', changedByUserId: customer.id },
    });
  }

  it('atomic accept: exactly one of two racing technicians wins; loser is stale with no mutation', async () => {
    if (!hasRealDb) {
      return;
    }
    await seedProbe();
    expect(requestId).not.toBe('');

    const acceptWhere = {
      where: { id: requestId, technicianId: techProfileId, status: 'pending' as const },
      data: { status: 'accepted' as const, acceptedAt: new Date() },
    };

    // Winner: interactive transaction holds the row lock long enough for
    // the loser's write to queue behind it.
    const winnerPromise = prisma.$transaction(
      async (tx) => {
        const claimed = await tx.serviceRequest.updateMany(acceptWhere);
        await new Promise((resolve) => setTimeout(resolve, 400));
        await tx.serviceRequestStatusHistory.create({
          data: {
            serviceRequestId: requestId,
            fromStatus: 'pending',
            toStatus: 'accepted',
            changedByUserId: techUserId,
          },
        });
        return claimed.count;
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    // Loser: independent client, executes while the winner holds the lock.
    const loserClient = new PrismaClient({ datasources: { db: { url: realDbUrl } } });
    await new Promise((resolve) => setTimeout(resolve, 120));
    const loserCount = (await loserClient.serviceRequest.updateMany(acceptWhere)).count;
    await loserClient.$disconnect();

    const winnerCount = await winnerPromise;

    // Exactly one winner; the loser is stale (count 0).
    expect(winnerCount + loserCount).toBe(1);
    expect(winnerCount).toBe(1);
    expect(loserCount).toBe(0);

    // Exactly one accept history record exists (mutation/history consistency).
    const history = await prisma.serviceRequestStatusHistory.findMany({
      where: { serviceRequestId: requestId, toStatus: 'accepted' },
    });
    expect(history).toHaveLength(1);

    const final = await prisma.serviceRequest.findUniqueOrThrow({ where: { id: requestId } });
    expect(final.status).toBe('accepted');
  });
});
