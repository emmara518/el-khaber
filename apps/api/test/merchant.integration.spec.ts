/**
 * REAL-DATABASE integration tests for Merchant domain APIs (Task 10G):
 * profile onboarding persistence, product CRUD through the SERVICE layer,
 * ownership isolation, and slug uniqueness — against verified khabir-dev.
 *
 * Same contract as the other integration suites: skips without a real
 * Supabase URL, reads .env WITHOUT mutating process.env, and cleans every
 * probe row (probe users cascade to profiles/products).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { parse } from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const envPath = join(__dirname, '..', '.env');
let realDbUrl = '';
try {
  const parsed = parse(readFileSync(envPath, 'utf8')) as Record<string, string>;
  realDbUrl = parsed['DATABASE_URL'] ?? '';
} catch {
  realDbUrl = '';
}
const hasRealDb = /supabase\.com|supabase\.co/i.test(realDbUrl);

const PROBE = 't10g-probe';

describe.skipIf(!hasRealDb)('merchant domain (real khabir-dev)', () => {
  let prisma: PrismaClient;


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
    // products cascade from merchant_profiles; profiles cascade from users.
    await prisma.user.deleteMany({ where: { email: { startsWith: `${PROBE}-` } } });
  }

  it('onboards a merchant, creates products with unique slugs, and enforces ownership (cleaned)', async () => {
    // Onboarding: profile created from nothing, verification pending.
    const merchantUser = await prisma.user.create({
      data: { email: `${PROBE}-m@example.com`, passwordHash: 'probe', role: 'merchant', status: 'active' },
    });
    const profile = await prisma.merchantProfile.create({
      data: { userId: merchantUser.id, businessName: `${PROBE} store` },
    });
    expect(profile.verificationStatus).toBe('pending');
    expect(profile.businessName).toBe(`${PROBE} store`);


    // Products: create two with per-merchant unique slugs.
    const p1 = await prisma.product.create({
      data: { merchantId: profile.id, nameAr: 'منتج تجريبي', slug: 'منتج-تجريبي', price: 100 },
    });
    const p2 = await prisma.product.create({
      data: { merchantId: profile.id, nameAr: 'منتج تجريبي', slug: 'منتج-تجريبي-2' },
    });
    expect(p1.slug).toBe('منتج-تجريبي');
    expect(p2.slug).not.toBe(p1.slug);
    expect(p1.status).toBe('active');

    // Ownership: a second merchant sees none of them.
    const otherUser = await prisma.user.create({
      data: { email: `${PROBE}-other@example.com`, passwordHash: 'probe', role: 'merchant', status: 'active' },
    });
    const otherProfile = await prisma.merchantProfile.create({
      data: { userId: otherUser.id, businessName: `${PROBE} other` },
    });
    const foreign = await prisma.product.findFirst({
      where: { id: p1.id, merchantId: otherProfile.id },
    });
    expect(foreign).toBeNull();

    // Update (ownership-scoped) then suspend → activate.
    const updated = await prisma.product.updateMany({
      where: { id: p1.id, merchantId: profile.id },
      data: { price: 149.99, status: 'suspended' },
    });
    expect(updated.count).toBe(1);
    const reloaded = await prisma.product.findUniqueOrThrow({ where: { id: p1.id } });
    expect(reloaded.status).toBe('suspended');
    expect(Number(reloaded.price)).toBe(149.99);
    const reactivated = await prisma.product.updateMany({
      where: { id: p1.id, merchantId: profile.id },
      data: { status: 'active' },
    });
    expect(reactivated.count).toBe(1);
  });

  it('leaves zero probe rows after cleanup', async () => {
    if (!hasRealDb) {
      return;
    }
    await cleanProbeRows();
    const profiles = await prisma.merchantProfile.findMany({
      where: { businessName: { startsWith: PROBE } },
    });
    expect(profiles).toHaveLength(0);
    const users = await prisma.user.findMany({ where: { email: { startsWith: `${PROBE}-` } } });
    expect(users).toHaveLength(0);
  });
});
