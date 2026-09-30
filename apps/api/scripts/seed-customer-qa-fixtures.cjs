/**
 * EL-KHABIR — Customer QA fixture seed (blocker closure PHASE 6).
 *
 * Provisions legitimate domain records for the QA customer account so
 * lifecycle/list/notification/subscription STATES can be rendered and
 * verified at runtime. Idempotent and additive; never deletes data.
 *
 * NOTE: request states are seeded directly (no technician credentials in
 * this environment), so this verifies STATE RENDERING, not API-driven
 * transitions. Documented in the closure report.
 *
 * Usage (from apps/api):
 *   node scripts/seed-customer-qa-fixtures.cjs
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const url = process.env.DATABASE_URL || '';
if (/prod/i.test(url) || /khabir-prod/i.test(url)) {
  console.error('FAIL: refusing to seed a production database');
  process.exit(1);
}
const prisma = new PrismaClient({ datasources: { db: { url } } });
const EMAIL = process.env.QA_FIXTURE_EMAIL || 'vqa.close@khabir.local';

async function main() {
  const user = await prisma.user.findFirst({ where: { email: EMAIL }, select: { id: true } });
  if (!user) throw new Error(`no user ${EMAIL}`);

  const cat = await prisma.applianceCategory.findFirst({
    where: { slug: 'washing_machine' },
    select: { id: true },
  });
  let loc = await prisma.location.findFirst({ where: { userId: user.id }, select: { id: true } });
  if (!loc) {
    loc = await prisma.location.create({
      data: { userId: user.id, label: 'المنزل', addressText: 'مدينة نصر', city: 'القاهرة' },
      select: { id: true },
    });
  }
  const tech = await prisma.technicianProfile.findFirst({ select: { id: true } });

  const statusTitleAr = {
    pending: 'صيانة غسالة لا تعصر',
    accepted: 'فحص تسرب مياه من الغسالة',
    on_the_way: 'غسالة تصدر صوتًا مرتفعًا',
    in_progress: 'ثلاجة لا تبرد بشكل كافٍ',
    completed: 'صيانة غسالة',
  };
  const statuses = ['pending', 'accepted', 'on_the_way', 'in_progress', 'completed'];
  let created = 0;
  for (const status of statuses) {
    const existing = await prisma.serviceRequest.findFirst({
      where: { customerId: user.id, status: status },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.serviceRequest.create({
      data: {
        customerId: user.id,
        technicianId: status === 'pending' ? null : tech?.id ?? null,
        applianceCategoryId: cat.id,
        status: status,
        problemTitle: statusTitleAr[status],
        problemDescription: 'الغسالة لا تدور أثناء العصر ويصدر صوت مرتفع.',
        locationId: loc.id,
        scheduledAt: new Date(Date.now() + 86400000),
      },
    });
    created += 1;
  }

  const notifCount = await prisma.notification.count({ where: { userId: user.id } });
  if (notifCount < 3) {
    await prisma.notification.createMany({
      data: [
        { userId: user.id, type: 'request_status', titleAr: 'تم قبول طلبك', bodyAr: 'وافق الفني على تنفيذ طلبك وسيتواصل معك.' },
        { userId: user.id, type: 'request_status', titleAr: 'الفني في الطريق', bodyAr: 'الفني في طريقه إلى موقعك الآن.' },
        { userId: user.id, type: 'system', titleAr: 'مرحبًا بك في الخبير', bodyAr: 'شكرًا لانضمامك. تصفح الخدمات واطلب فنيًا بسهولة.', readAt: new Date() },
      ],
    });
  }

  const activeSub = await prisma.subscription.findFirst({
    where: { userId: user.id, status: 'active' },
    select: { id: true },
  });
  if (!activeSub) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { role: 'customer', isActive: true },
      select: { id: true },
      orderBy: { price: 'asc' },
    });
    if (plan) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: 'active',
          startedAt: new Date(),
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
          renewalEnabled: true,
        },
      });
    }
  }

  const reqTotal = await prisma.serviceRequest.count({ where: { customerId: user.id } });
  const nTotal = await prisma.notification.count({ where: { userId: user.id } });
  console.log(`DONE requests_created=${created} requests_total=${reqTotal} notifications_total=${nTotal}`);
}

main()
  .catch((e) => {
    console.error('FAIL:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
