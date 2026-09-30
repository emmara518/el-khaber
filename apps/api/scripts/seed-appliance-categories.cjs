/**
 * EL-KHABIR — canonical appliance-category seed (Customer PHASE 2).
 *
 * Idempotent and NON-DESTRUCTIVE: creates only missing categories, keyed by
 * the unique `slug`. Existing records are never updated or deleted.
 *
 * Canonical home-appliance taxonomy (server-owned slugs). `water-heater1`
 * is a visual variant of `water_heater` and is intentionally NOT a category.
 *
 * Usage (from apps/api):
 *   node scripts/seed-appliance-categories.cjs
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const url = process.env.DATABASE_URL || '';
if (!url) {
  console.error('FAIL: DATABASE_URL is not set');
  process.exit(1);
}
if (/prod/i.test(url) || /khabir-prod/i.test(url)) {
  console.error('FAIL: refusing to seed a production database');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

/** Canonical categories → Arabic name, sortOrder. */
const CATEGORIES = [
  { slug: 'coffee_machine', nameAr: 'ماكينات القهوة', sortOrder: 5 },
  { slug: 'microwave', nameAr: 'ميكروويف', sortOrder: 6 },
  { slug: 'oven', nameAr: 'أفران', sortOrder: 7 },
  { slug: 'tv_screen', nameAr: 'شاشات', sortOrder: 8 },
  { slug: 'vacuum_cleaner', nameAr: 'مكانس كهربائية', sortOrder: 9 },
  { slug: 'water_heater', nameAr: 'سخانات المياه', sortOrder: 10 },
];

async function main() {
  let created = 0;
  let existing = 0;
  for (const c of CATEGORIES) {
    const found = await prisma.applianceCategory.findFirst({
      where: { slug: c.slug },
      select: { id: true },
    });
    if (found) {
      existing += 1;
      console.log(`skip   ${c.slug} (exists)`);
      continue;
    }
    await prisma.applianceCategory.create({
      data: { slug: c.slug, nameAr: c.nameAr, isActive: true, sortOrder: c.sortOrder },
    });
    created += 1;
    console.log(`create ${c.slug} → ${c.nameAr}`);
  }
  const total = await prisma.applianceCategory.count();
  console.log(`DONE created=${created} existing=${existing} total=${total}`);
}

main()
  .catch((err) => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
