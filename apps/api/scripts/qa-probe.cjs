/* QA read-only probe: reports schema surface + row counts for the QA DB.
 * Never writes. Reads DATABASE_URL from apps/api/.env (dotenv). No secrets printed. */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function safe(label, fn) {
  try {
    const v = await fn();
    console.log(`${label}: ${JSON.stringify(v)}`);
  } catch (e) {
    console.log(`${label}: ERR ${e.message.split('\n')[0]}`);
  }
}

(async () => {
  const u = new URL(process.env.DATABASE_URL);
  console.log('DB_TARGET:', `${u.hostname}:${u.port}${u.pathname}`);

  await safe('TABLES', async () => {
    const rows = await p.$queryRawUnsafe(
      "select table_name from information_schema.tables where table_schema='public' order by table_name",
    );
    return rows.map((r) => r.table_name);
  });
  await safe('APPLIANCE_CATEGORIES', async () => {
    const rows = await p.applianceCategory.findMany({ select: { slug: true, isActive: true } });
    return rows.map((r) => `${r.slug}${r.isActive ? '' : '(inactive)'}`);
  });
  await safe('SERVICES', () => p.service.count());
  await safe('FAULTS', () => p.fault.count());
  await safe('USERS_BY_ROLE', () =>
    p.user.groupBy({ by: ['role'], _count: { _all: true } }),
  );
  await safe('USERS', async () => {
    const rows = await p.user.findMany({ select: { email: true, role: true, status: true } });
    return rows;
  });
  await safe('ADMIN_USERS', async () => {
    const rows = await p.adminUser.findMany({ select: { email: true, role: true, status: true } });
    return rows;
  });
  await safe('TECHNICIAN_PROFILES', () =>
    p.technicianProfile.findMany({
      select: { displayName: true, verificationStatus: true, availabilityStatus: true },
    }),
  );
  await safe('MERCHANT_PROFILES', () =>
    p.merchantProfile.findMany({ select: { businessName: true, verificationStatus: true } }),
  );
  await safe('SUBSCRIPTION_PLANS', () =>
    p.subscriptionPlan.findMany({ select: { role: true, code: true, isActive: true } }),
  );
  await safe('PAYMENT_METHODS', () =>
    p.paymentMethodConfig.findMany({ select: { method: true, isEnabled: true } }),
  );
  await safe('SERVICE_REQUESTS_BY_STATUS', () =>
    p.serviceRequest.groupBy({ by: ['status'], _count: { _all: true } }),
  );
  await safe('PRODUCTS', () => p.merchantProduct.count());
  await safe('NOTIFICATIONS', () => p.notification.count());
  await safe('REVIEWS', () => p.review.count());
  await safe('CONVERSATIONS', () => p.conversation.count());

  await p.$disconnect();
})().catch((e) => {
  console.error('PROBE FAILED', e.message);
  process.exit(1);
});
