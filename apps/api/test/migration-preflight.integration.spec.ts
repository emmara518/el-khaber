/**
 * REAL-DATABASE regression for the existing-data migration preflight.
 *
 * It removes one additive constraint, inserts the exact legacy condition
 * that the preflight must detect, runs the read-only script, restores the
 * constraint, and confirms the clean database passes.
 */

import { spawnSync } from 'node:child_process';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { readTestDatabaseUrl, withTestPoolLimit } from './real-db-url';

const realDbUrl = withTestPoolLimit(readTestDatabaseUrl());
const hasRealDb = realDbUrl !== '';

const PROBE = `preflight-${Date.now().toString(36)}`;

describe.skipIf(!hasRealDb)('migration preflight (isolated test database)', () => {
  let prisma: PrismaClient;
  let userId = '';
  let merchantId = '';
  let productId = '';

  function runPreflight(): ReturnType<typeof spawnSync> {
    return spawnSync(process.execPath, ['scripts/check-migration-preflight.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: realDbUrl, DIRECT_URL: realDbUrl },
      encoding: 'utf8',
    });
  }

  async function cleanup(): Promise<void> {
    if (productId !== '') {
      await prisma.product.deleteMany({ where: { id: productId } }).catch(() => undefined);
      productId = '';
    }
    if (merchantId !== '') {
      await prisma.merchantProfile.deleteMany({ where: { id: merchantId } }).catch(() => undefined);
      merchantId = '';
    }
    if (userId !== '') {
      await prisma.user.deleteMany({ where: { id: userId } }).catch(() => undefined);
      userId = '';
    }
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_price_nonnegative"',
    );
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "products" ADD CONSTRAINT "products_price_nonnegative" CHECK ("price" IS NULL OR "price" >= 0)',
    );
  }

  beforeAll(async () => {
    prisma = new PrismaClient({ datasources: { db: { url: realDbUrl } } });
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('fails on legacy negative prices, then passes after repair', async () => {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_price_nonnegative"',
    );
    const user = await prisma.user.create({
      data: {
        email: `${PROBE}@example.com`,
        passwordHash: 'preflight-probe-not-a-login',
        role: 'merchant',
        status: 'active',
      },
      select: { id: true },
    });
    userId = user.id;
    const merchant = await prisma.merchantProfile.create({
      data: { userId, businessName: 'Preflight Probe', verificationStatus: 'verified' },
      select: { id: true },
    });
    merchantId = merchant.id;
    const product = await prisma.product.create({
      data: {
        merchantId,
        nameAr: 'Legacy Negative Price',
        slug: `${PROBE}-product`,
        price: -1,
        status: 'active',
      },
      select: { id: true },
    });
    productId = product.id;

    const failed = runPreflight();
    expect(failed.status).toBe(1);
    expect(String(failed.stdout)).toContain('products_price_negative');

    await prisma.product.delete({ where: { id: productId } });
    productId = '';
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "products" ADD CONSTRAINT "products_price_nonnegative" CHECK ("price" IS NULL OR "price" >= 0)',
    );

    const passed = runPreflight();
    expect(passed.status).toBe(0);
    expect(String(passed.stdout)).toContain('"status": "pass"');
  });
});
