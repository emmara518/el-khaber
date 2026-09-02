/**
 * Al-Khabir API — database seed (development only).
 *
 * This file is a structural placeholder. It is wired into
 * `apps/api/package.json#prisma.seed` so that `pnpm db:seed` works as
 * soon as the development database is available. The actual seed logic
 * is intentionally minimal here: it only verifies connectivity. Product
 * seed data (appliance categories, fault articles, plans) belongs to
 * later tasks and is not part of Task #002 scope.
 *
 * Source: docs/06_DATABASE.md, docs/10_ENGINEERING_RULES.md §22.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const userCount = await prisma.user.count();
  const adminCount = await prisma.adminUser.count();
   
  console.log(
    `[seed] users=${String(userCount)} admin_users=${String(adminCount)} — no product seed data is created in Task #002.`,
  );
}

main()
  .catch((error: unknown) => {
     
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
