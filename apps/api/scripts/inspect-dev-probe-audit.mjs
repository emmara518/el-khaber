#!/usr/bin/env node
/** READ-ONLY classification of khabir-dev probe residue. No writes. */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import { parse } from 'dotenv';

if (process.env.ALLOW_DEV_READONLY_CHECK !== 'true') {
  throw new Error('Set ALLOW_DEV_READONLY_CHECK=true.');
}
const here = dirname(fileURLToPath(import.meta.url));
const { DATABASE_URL: url = '' } = parse(readFileSync(join(here, '..', '.env'), 'utf8'));
if (url === '') throw new Error('DATABASE_URL missing');
const host = new URL(url).hostname.toLowerCase();
if (!/supabase\.(com|co|in)/i.test(host) || /prod/i.test(host)) {
  throw new Error('Refusing: dev Supabase target expected.');
}

const prisma = new PrismaClient({ datasources: { db: { url } } });
try {
  const byAction = await prisma.$queryRawUnsafe(
    `SELECT action, entity_type, count(*)::int AS n
       FROM audit_logs
      WHERE after_json::text LIKE '%t10%-probe%'
      GROUP BY action, entity_type
      ORDER BY n DESC`,
  );
  console.log('AUDIT_BY_ACTION');
  for (const row of byAction) console.log(`${row.action} | ${row.entity_type} | ${String(row.n)}`);

  const markers = ['t10f-probe', 't10g-probe', 't10h-probe', 't10i-probe', 't10m-probe'];
  console.log('AUDIT_BY_MARKER');
  for (const marker of markers) {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT count(*)::int AS n FROM audit_logs WHERE after_json::text LIKE $1',
      `%${marker}%`,
    );
    console.log(`${marker} | ${String(rows?.[0]?.n ?? 0)}`);
  }

  const columns = await prisma.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'products'
      ORDER BY ordinal_position`,
  );
  console.log('PRODUCT_COLUMNS');
  console.log(columns.map((c) => c.column_name).join(', '));
  const products = await prisma.$queryRawUnsafe('SELECT count(*)::int AS n FROM products');
  console.log(`products.total=${String(products?.[0]?.n ?? 0)}`);
} finally {
  await prisma.$disconnect();
}
