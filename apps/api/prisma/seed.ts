/**
 * Al-Khabir API — reference-data seed.
 *
 * DEVELOPMENT/REFERENCE SEED ONLY. This seed:
 *   - creates NO user identities, profiles, or business data,
 *   - is idempotent (safe to re-run),
 *   - only upserts catalog/reference rows required by docs/06_DATABASE.md
 *     and docs/08_SUBSCRIPTIONS.md:
 *       appliance categories (canonical baseline),
 *       entitlements (docs/08 §5),
 *       review tags (docs/06 §14),
 *       subscription plans (3 tiers × 3 roles, INACTIVE — pricing is
 *       commercially TBD per docs/08; admin activates after approval).
 *
 * Run: pnpm --filter @khabir/api db:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Appliance categories — canonical baseline (docs/06_DATABASE.md §7).
  const categories = [
    { slug: 'washing_machine', nameAr: 'غسالات', sortOrder: 1 },
    { slug: 'refrigerator', nameAr: 'ثلاجات', sortOrder: 2 },
    { slug: 'air_conditioner', nameAr: 'تكييفات', sortOrder: 3 },
  ];
  for (const c of categories) {
    await prisma.applianceCategory.upsert({
      where: { slug: c.slug },
      update: { nameAr: c.nameAr, sortOrder: c.sortOrder },
      create: { slug: c.slug, nameAr: c.nameAr, sortOrder: c.sortOrder },
    });
  }

  const categoryRows = await prisma.applianceCategory.findMany({
    where: { slug: { in: categories.map((c) => c.slug) } },
    select: { id: true, slug: true },
  });
  const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row.id]));

  // Canonical service/fault reference catalog. Onboarding and request
  // creation require at least one service per category; these are
  // reference rows only (no users, pricing, or commercial data).
  const serviceSeeds = [
    { category: 'washing_machine', slug: 'washing_repair', nameAr: 'صيانة غسالات', descriptionAr: 'إصلاح وصيانة الغسالات المنزلية', sortOrder: 1 },
    { category: 'washing_machine', slug: 'washing_install', nameAr: 'تركيب غسالات', descriptionAr: 'تركيب وتوصيل الغسالات المنزلية', sortOrder: 2 },
    { category: 'refrigerator', slug: 'fridge_repair', nameAr: 'صيانة ثلاجات', descriptionAr: 'إصلاح وصيانة الثلاجات المنزلية', sortOrder: 1 },
    { category: 'air_conditioner', slug: 'ac_repair', nameAr: 'صيانة تكييفات', descriptionAr: 'إصلاح وصيانة أجهزة التكييف', sortOrder: 1 },
  ] as const;

  for (const seed of serviceSeeds) {
    const applianceCategoryId = categoryBySlug.get(seed.category);
    if (applianceCategoryId === undefined) continue;
    await prisma.service.upsert({
      where: {
        applianceCategoryId_slug: { applianceCategoryId, slug: seed.slug },
      },
      update: {
        nameAr: seed.nameAr,
        descriptionAr: seed.descriptionAr,
        isActive: true,
        sortOrder: seed.sortOrder,
      },
      create: {
        applianceCategoryId,
        slug: seed.slug,
        nameAr: seed.nameAr,
        descriptionAr: seed.descriptionAr,
        isActive: true,
        sortOrder: seed.sortOrder,
      },
    });
  }

  const faultSeeds = [
    { category: 'washing_machine', slug: 'no_spin', nameAr: 'الغسالة لا تدور', summaryAr: 'الغسالة لا تدور أثناء دورة العصر', guidanceAr: 'تحقق من إغلاق الباب وتوازن الحمل قبل طلب الفني.', sortOrder: 1 },
    { category: 'washing_machine', slug: 'leak', nameAr: 'تسريب مياه', summaryAr: 'تسريب مياه من أسفل الغسالة', guidanceAr: 'أغلق مصدر المياه وأوقف التشغيل فورًا.', sortOrder: 2 },
    { category: 'washing_machine', slug: 'loud_noise', nameAr: 'صوت مرتفع', summaryAr: 'صوت مرتفع أثناء دورة الغسيل', guidanceAr: 'تحقق من استواء الغسالة وعدم وجود أجسام غريبة.', sortOrder: 3 },
    { category: 'refrigerator', slug: 'not_cooling', nameAr: 'لا يبرد', summaryAr: 'الثلاجة لا تبرد بشكل كافٍ', guidanceAr: 'تحقق من إغلاق الباب ودرجة الحرارة المضبوطة.', sortOrder: 1 },
    { category: 'air_conditioner', slug: 'not_cooling', nameAr: 'لا يبرد', summaryAr: 'التكييف لا يبرد بشكل كافٍ', guidanceAr: 'تحقق من الفلتر ووضع التشغيل قبل طلب الفني.', sortOrder: 1 },
  ] as const;

  const faultRows = [] as Array<{ id: string; category: string; slug: string }>;
  for (const seed of faultSeeds) {
    const applianceCategoryId = categoryBySlug.get(seed.category);
    if (applianceCategoryId === undefined) continue;
    const row = await prisma.fault.upsert({
      where: {
        applianceCategoryId_slug: { applianceCategoryId, slug: seed.slug },
      },
      update: {
        nameAr: seed.nameAr,
        summaryAr: seed.summaryAr,
        guidanceAr: seed.guidanceAr,
        publishStatus: 'published',
        sortOrder: seed.sortOrder,
      },
      create: {
        applianceCategoryId,
        slug: seed.slug,
        nameAr: seed.nameAr,
        summaryAr: seed.summaryAr,
        guidanceAr: seed.guidanceAr,
        publishStatus: 'published',
        sortOrder: seed.sortOrder,
      },
      select: { id: true },
    });
    faultRows.push({ id: row.id, category: seed.category, slug: seed.slug });
  }

  const serviceRows = await prisma.service.findMany({
    where: { slug: { in: serviceSeeds.map((s) => s.slug) } },
    select: { id: true, applianceCategoryId: true, slug: true },
  });
  const serviceByCategorySlug = new Map(
    serviceRows.map((row) => [`${row.applianceCategoryId}:${row.slug}`, row.id]),
  );
  const faultLinks = [
    { category: 'washing_machine', fault: 'no_spin', service: 'washing_repair' },
    { category: 'washing_machine', fault: 'leak', service: 'washing_repair' },
    { category: 'refrigerator', fault: 'not_cooling', service: 'fridge_repair' },
    { category: 'air_conditioner', fault: 'not_cooling', service: 'ac_repair' },
  ] as const;
  for (const link of faultLinks) {
    const applianceCategoryId = categoryBySlug.get(link.category);
    if (applianceCategoryId === undefined) continue;
    const serviceId = serviceByCategorySlug.get(`${applianceCategoryId}:${link.service}`);
    const fault = faultRows.find(
      (row) => row.category === link.category && row.slug === link.fault,
    );
    if (serviceId === undefined || fault === undefined) continue;
    await prisma.faultServiceLink.upsert({
      where: { faultId_serviceId: { faultId: fault.id, serviceId } },
      update: {},
      create: { faultId: fault.id, serviceId },
    });
  }

  // Entitlements — documented key set (docs/08_SUBSCRIPTIONS.md §5).
  const entitlements: Array<{ code: string; nameAr: string; featureGroup: string }> = [
    { code: 'priority_support', nameAr: 'دعم ذو أولوية', featureGroup: 'support' },
    { code: 'featured_visibility', nameAr: 'ظهور مميز', featureGroup: 'visibility' },
    { code: 'advanced_search', nameAr: 'بحث متقدم', featureGroup: 'search' },
    { code: 'analytics_basic', nameAr: 'تحليلات أساسية', featureGroup: 'analytics' },
    { code: 'analytics_advanced', nameAr: 'تحليلات متقدمة', featureGroup: 'analytics' },
    { code: 'portfolio_extended', nameAr: 'أعمال موسعة', featureGroup: 'portfolio' },
    { code: 'catalog_extended', nameAr: 'كتالوج موسع', featureGroup: 'catalog' },
    { code: 'promotional_tools', nameAr: 'أدوات ترويجية', featureGroup: 'marketing' },
    { code: 'verified_badge', nameAr: 'شارة موثّق', featureGroup: 'trust' },
    { code: 'premium_offers', nameAr: 'عروض مميزة', featureGroup: 'offers' },
    { code: 'advanced_ai_access', nameAr: 'مساعد ذكي متقدم', featureGroup: 'ai' },
  ];
  for (const e of entitlements) {
    await prisma.entitlement.upsert({
      where: { code: e.code },
      update: { nameAr: e.nameAr, featureGroup: e.featureGroup },
      create: e,
    });
  }

  // Review tags — documented structured feedback (docs/06_DATABASE.md §14).
  const reviewTags = [
    { code: 'response_speed', labelAr: 'سرعة الاستجابة' },
    { code: 'punctuality', labelAr: 'الالتزام بالموعد' },
    { code: 'repair_quality', labelAr: 'جودة الإصلاح' },
    { code: 'good_dealing', labelAr: 'حسن التعامل' },
    { code: 'fair_price', labelAr: 'سعر مناسب' },
  ];
  for (const t of reviewTags) {
    await prisma.reviewTag.upsert({
      where: { code: t.code },
      update: { labelAr: t.labelAr },
      create: t,
    });
  }

  // Subscription plans — 3 tiers × 3 roles (docs/06 §17, docs/08 §3).
  // is_active=false: no commercial pricing is approved yet (docs/08).
  // Prices/currency are placeholders pending commercial approval; the admin
  // surface owns pricing changes (docs/08 §17).
  const planTiers = [
    { code: 'basic', nameAr: 'عادي', nameEn: 'Basic', sortOrder: 1 },
    { code: 'platinum', nameAr: 'بلاتينيوم', nameEn: 'Platinum', sortOrder: 2 },
    { code: 'vip', nameAr: 'VIP', nameEn: 'VIP', sortOrder: 3 },
  ];
  const roles = ['customer', 'technician', 'merchant'] as const;
  for (const role of roles) {
    for (const tier of planTiers) {
      const key = { role, code: tier.code };
      await prisma.subscriptionPlan.upsert({
        where: { role_code: key },
        update: { nameAr: tier.nameAr, nameEn: tier.nameEn, sortOrder: tier.sortOrder },
        create: {
          ...key,
          nameAr: tier.nameAr,
          nameEn: tier.nameEn,
          billingInterval: 'monthly',
          price: 0.0,
          currency: 'EGP',
          isActive: false,
          sortOrder: tier.sortOrder,
        },
      });
    }
  }

  const [
    categoriesCount,
    servicesCount,
    faultsCount,
    entitlementsCount,
    reviewTagsCount,
    plansCount,
  ] = await Promise.all([
    prisma.applianceCategory.count(),
    prisma.service.count(),
    prisma.fault.count(),
    prisma.entitlement.count(),
    prisma.reviewTag.count(),
    prisma.subscriptionPlan.count(),
  ]);

  console.log(
    `[seed] reference data ready — categories=${String(categoriesCount)} services=${String(servicesCount)} faults=${String(faultsCount)} entitlements=${String(entitlementsCount)} review_tags=${String(reviewTagsCount)} plans=${String(plansCount)} (plans inactive — pricing TBD). No user data is created.`,
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
