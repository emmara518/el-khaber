/**
 * EL-KHABIR — QA seed for the shared QA/dev PostgreSQL database.
 *
 * Idempotent and NON-DESTRUCTIVE: every record is upserted or matched by a
 * deterministic marker. It never deletes or resets existing data.
 *
 * Safety: refuses to run against an obvious production database.
 * Credentials: the QA account password is read from QA_SEED_PASSWORD and is
 * NEVER written to this file or to git.
 *
 * Usage (from apps/api):
 *   $env:QA_SEED_PASSWORD='<qa-password>'; node scripts/qa-seed.cjs
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../dist/auth/password');

const url = process.env.DATABASE_URL || '';
if (!url) {
  console.error('FAIL: DATABASE_URL is not set');
  process.exit(1);
}
if (/prod/i.test(url) || /khabir-prod/i.test(url)) {
  console.error('FAIL: refusing to seed a production database');
  process.exit(1);
}
const PASSWORD = process.env.QA_SEED_PASSWORD;
if (!PASSWORD || PASSWORD.length < 8) {
  console.error('FAIL: QA_SEED_PASSWORD (>=8 chars) is required — never hard-code it');
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } } });

const EMAIL = {
  customer: 'customer@qa.khabir.app',
  technician: 'technician@qa.khabir.app',
  technician2: 'technician2@qa.khabir.app',
  merchant: 'merchant@qa.khabir.app',
  admin: 'admin@qa.khabir.app',
};

async function ensureUser(email, role) {
  const passwordHash = await hashPassword(PASSWORD);
  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, role, status: 'active' },
    });
    return existing.id;
  }
  const u = await prisma.user.create({
    data: { email, passwordHash, role, status: 'active', emailVerified: true },
    select: { id: true },
  });
  return u.id;
}

async function ensureAdmin(email) {
  const passwordHash = await hashPassword(PASSWORD);
  const existing = await prisma.adminUser.findFirst({ where: { email }, select: { id: true } });
  if (existing) {
    await prisma.adminUser.update({
      where: { id: existing.id },
      data: { passwordHash, role: 'super_admin', status: 'active' },
    });
    return existing.id;
  }
  const a = await prisma.adminUser.create({
    data: { email, passwordHash, role: 'super_admin', status: 'active' },
    select: { id: true },
  });
  return a.id;
}

async function main() {
  // ---------------------------------------------------------------- catalog
  const catWash = await prisma.applianceCategory.upsert({
    where: { slug: 'washing_machine' },
    update: { isActive: true },
    create: { nameAr: 'غسالات', slug: 'washing_machine', isActive: true, sortOrder: 1 },
  });
  const catFridge = await prisma.applianceCategory.upsert({
    where: { slug: 'refrigerator' },
    update: { isActive: true },
    create: { nameAr: 'ثلاجات', slug: 'refrigerator', isActive: true, sortOrder: 2 },
  });
  const catAc = await prisma.applianceCategory.upsert({
    where: { slug: 'air_conditioner' },
    update: { isActive: true },
    create: { nameAr: 'تكييفات', slug: 'air_conditioner', isActive: true, sortOrder: 3 },
  });
  // Empty-results scenario: an active category with NO technicians.
  const catDish = await prisma.applianceCategory.upsert({
    where: { slug: 'dishwasher' },
    update: { isActive: true },
    create: { nameAr: 'غسالات أطباق', slug: 'dishwasher', isActive: true, sortOrder: 4 },
  });

  async function ensureService(cat, slug, nameAr, descriptionAr, sortOrder) {
    return prisma.service.upsert({
      where: { applianceCategoryId_slug: { applianceCategoryId: cat.id, slug } },
      update: { isActive: true, nameAr, descriptionAr },
      create: { applianceCategoryId: cat.id, slug, nameAr, descriptionAr, isActive: true, sortOrder },
    });
  }
  async function ensureFault(cat, slug, nameAr, summaryAr, guidanceAr, sortOrder) {
    return prisma.fault.upsert({
      where: { applianceCategoryId_slug: { applianceCategoryId: cat.id, slug } },
      update: { publishStatus: 'published' },
      create: {
        applianceCategoryId: cat.id,
        slug,
        nameAr,
        summaryAr,
        guidanceAr,
        safetyNoteAr: 'افصل الكهرباء قبل الفحص.',
        whenToCallTechnicianAr: 'اتصل بالفني إذا استمرت المشكلة.',
        publishStatus: 'published',
        sortOrder,
      },
    });
  }

  const svcWash = await ensureService(catWash, 'washing_repair', 'صيانة غسالات', 'إصلاح أعطال الغسالات', 1);
  const svcWashInstall = await ensureService(catWash, 'washing_install', 'تركيب غسالات', 'تركيب وتوصيل الغسالات', 2);
  const svcFridge = await ensureService(catFridge, 'fridge_repair', 'صيانة ثلاجات', 'إصلاح أعطال الثلاجات', 1);
  const svcAc = await ensureService(catAc, 'ac_repair', 'صيانة تكييفات', 'إصلاح أعطال التكييف', 1);
  await ensureService(catDish, 'dishwasher_repair', 'صيانة غسالات الأطباق', 'إصلاح أعطال غسالات الأطباق', 1);

  const faultNoSpin = await ensureFault(catWash, 'no_spin', 'الغسالة لا تدور', 'الغسالة لا تدور أثناء العصر', 'تحقق من الكهرباء وتوزيع الحمل.', 1);
  const faultLeak = await ensureFault(catWash, 'leak', 'تسرب مياه', 'تسرب مياه من أسفل الغسالة', 'افحص الخراطيم والوصلات.', 2);
  const faultNoise = await ensureFault(catWash, 'loud_noise', 'صوت مرتفع', 'صوت مرتفع أثناء الغسيل', 'تحقق من استواء الغسالة.', 3);
  const faultFridge = await ensureFault(catFridge, 'not_cooling', 'لا تبرد', 'الثلاجة لا تبرد', 'تحقق من الإعدادات والتهوية.', 1);
  const faultAc = await ensureFault(catAc, 'not_cooling', 'لا تبرد', 'التكييف لا يبرد', 'نظف الفلاتر.', 1);

  await prisma.faultServiceLink.upsert({
    where: { faultId_serviceId: { faultId: faultNoSpin.id, serviceId: svcWash.id } },
    update: {},
    create: { faultId: faultNoSpin.id, serviceId: svcWash.id },
  });
  await prisma.faultServiceLink.upsert({
    where: { faultId_serviceId: { faultId: faultLeak.id, serviceId: svcWash.id } },
    update: {},
    create: { faultId: faultLeak.id, serviceId: svcWash.id },
  });
  await prisma.faultServiceLink.upsert({
    where: { faultId_serviceId: { faultId: faultFridge.id, serviceId: svcFridge.id } },
    update: {},
    create: { faultId: faultFridge.id, serviceId: svcFridge.id },
  });
  await prisma.faultServiceLink.upsert({
    where: { faultId_serviceId: { faultId: faultAc.id, serviceId: svcAc.id } },
    update: {},
    create: { faultId: faultAc.id, serviceId: svcAc.id },
  });

  // ------------------------------------------------------------- entitlements
  const ent = await prisma.entitlement.upsert({
    where: { code: 'priority_support' },
    update: { isActive: true },
    create: { code: 'priority_support', nameAr: 'دعم ذو أولوية', featureGroup: 'support' },
  });
  const entDiscount = await prisma.entitlement.upsert({
    where: { code: 'discount_10' },
    update: { isActive: true },
    create: { code: 'discount_10', nameAr: 'خصم 10%', featureGroup: 'pricing' },
  });

  async function ensurePlan(role, code, nameAr, nameEn, price, sortOrder) {
    return prisma.subscriptionPlan.upsert({
      where: { role_code: { role, code } },
      // Egyptian market: currency is EGP (corrected from a legacy SAR value).
      update: { isActive: true, price, nameAr, currency: 'EGP' },
      create: { role, code, nameAr, nameEn, billingInterval: 'monthly', price, currency: 'EGP', isActive: true, sortOrder },
    });
  }
  const planCustomer = await ensurePlan('customer', 'platinum', 'بلاتينيوم', 'Platinum', 99, 2);
  await ensurePlan('customer', 'basic', 'أساسي', 'Basic', 29, 1);
  const planMerchant = await ensurePlan('merchant', 'basic', 'باقة التاجر الأساسية', 'Merchant Basic', 49, 1);
  const planTechnician = await ensurePlan('technician', 'basic', 'باقة الفني الأساسية', 'Technician Basic', 39, 1);
  await prisma.planEntitlement.upsert({
    where: { planId_entitlementId: { planId: planCustomer.id, entitlementId: ent.id } },
    update: {},
    create: { planId: planCustomer.id, entitlementId: ent.id },
  });
  await prisma.planEntitlement.upsert({
    where: { planId_entitlementId: { planId: planCustomer.id, entitlementId: entDiscount.id } },
    update: {},
    create: { planId: planCustomer.id, entitlementId: entDiscount.id },
  });

  for (const [method, accountIdentifier, displayName] of [
    ['instapay', 'khabir@instapay', 'الخبير'],
    ['vodafone_cash', '01000000000', 'الخبير'],
  ]) {
    await prisma.paymentMethodConfig.upsert({
      where: { method },
      update: { isEnabled: true, accountIdentifier, displayName },
      create: { method, accountIdentifier, displayName, isEnabled: true },
    });
  }

  // ---------------------------------------------------------------- accounts
  const customerId = await ensureUser(EMAIL.customer, 'customer');
  const technicianId = await ensureUser(EMAIL.technician, 'technician');
  const technician2Id = await ensureUser(EMAIL.technician2, 'technician');
  const merchantId = await ensureUser(EMAIL.merchant, 'merchant');
  const adminId = await ensureAdmin(EMAIL.admin);

  await prisma.customerProfile.upsert({
    where: { userId: customerId },
    update: { firstName: 'عميل', lastName: 'تجريبي' },
    create: { userId: customerId, firstName: 'عميل', lastName: 'تجريبي' },
  });

  // --------------------------------------------------------------- locations
  async function ensureLocation(userId, label, addressText, city, lat, lng) {
    const existing = await prisma.location.findFirst({ where: { userId, label } });
    if (existing) {
      await prisma.location.update({
        where: { id: existing.id },
        data: { addressText, city, latitude: lat, longitude: lng },
      });
      return existing.id;
    }
    const l = await prisma.location.create({
      data: { userId, label, addressText, city, latitude: lat, longitude: lng },
      select: { id: true },
    });
    return l.id;
  }
  const locHome = await ensureLocation(customerId, 'المنزل', 'مدينة نصر', 'القاهرة', 30.0444, 31.2357);
  await ensureLocation(customerId, 'العمل', 'الدقي', 'الجيزة', 30.0389, 31.2118);

  // -------------------------------------------------------- technician profiles
  async function ensureTechnicianProfile(userId, displayName, bio, status, availability, years) {
    const existing = await prisma.technicianProfile.findFirst({ where: { userId } });
    if (existing) {
      return prisma.technicianProfile.update({
        where: { id: existing.id },
        data: { displayName, bio, verificationStatus: 'verified', availabilityStatus: availability, experienceYears: years },
      });
    }
    return prisma.technicianProfile.create({
      data: { userId, displayName, bio, verificationStatus: 'verified', availabilityStatus: availability, experienceYears: years },
    });
  }
  const prof1 = await ensureTechnicianProfile(technicianId, 'فني الخبير', 'فني معتمد لصيانة الغسالات والثلاجات', 'verified', 'available', 8);
  const prof2 = await ensureTechnicianProfile(technician2Id, 'فني الإصلاح السريع', 'فني متخصص في التكييفات', 'verified', 'unavailable', 5);

  async function ensureTechService(profileId, serviceId, priceFrom) {
    const existing = await prisma.technicianService.findUnique({
      where: { technicianId_serviceId: { technicianId: profileId, serviceId } },
    });
    if (existing) {
      await prisma.technicianService.update({ where: { technicianId_serviceId: { technicianId: profileId, serviceId } }, data: { isActive: true, priceFrom } });
      return;
    }
    await prisma.technicianService.create({ data: { technicianId: profileId, serviceId, priceFrom, isActive: true } });
  }
  await ensureTechService(prof1.id, svcWash.id, 150);
  await ensureTechService(prof1.id, svcWashInstall.id, 200);
  await ensureTechService(prof1.id, svcFridge.id, 180);
  await ensureTechService(prof2.id, svcAc.id, 220);

  async function ensureArea(profileId, labelAr, lat, lng) {
    const existing = await prisma.technicianServiceArea.findUnique({
      where: { technicianId_labelAr: { technicianId: profileId, labelAr } },
    });
    if (existing) {
      await prisma.technicianServiceArea.update({ where: { id: existing.id }, data: { latitude: lat, longitude: lng } });
      return;
    }
    await prisma.technicianServiceArea.create({ data: { technicianId: profileId, labelAr, latitude: lat, longitude: lng } });
  }
  // Remove legacy Saudi / corrupted service-area rows before re-adding the
  // Egyptian areas (idempotent; service areas are not referenced by requests).
  await prisma.technicianServiceArea.deleteMany({ where: { labelAr: { in: ['الرياض', 'جدة'] } } });
  await prisma.technicianServiceArea.deleteMany({ where: { labelAr: { contains: '?' } } });
  await ensureArea(prof1.id, 'القاهرة – مدينة نصر', 30.0511, 31.3656);
  await ensureArea(prof2.id, 'الإسكندرية – سموحة', 31.2156, 29.9553);

  // ------------------------------------------------------------ merchant data
  let merchantProfile = await prisma.merchantProfile.findFirst({ where: { userId: merchantId } });
  if (!merchantProfile) {
    merchantProfile = await prisma.merchantProfile.create({
      data: { userId: merchantId, businessName: 'متجر الخبير', bio: 'قطع غيار أجهزة منزلية أصلية', verificationStatus: 'verified', contactPhone: '01000000000' },
    });
  } else {
    merchantProfile = await prisma.merchantProfile.update({
      where: { id: merchantProfile.id },
      data: { businessName: 'متجر الخبير', verificationStatus: 'verified' },
    });
  }

  async function ensureProduct(slug, nameAr, descriptionAr, price, stock, status) {
    const existing = await prisma.product.findFirst({ where: { merchantId: merchantProfile.id, slug } });
    if (existing) {
      await prisma.product.update({ where: { id: existing.id }, data: { nameAr, descriptionAr, price, stockQuantity: stock, status } });
      return existing.id;
    }
    const p = await prisma.product.create({
      data: { merchantId: merchantProfile.id, slug, nameAr, descriptionAr, price, stockQuantity: stock, status },
      select: { id: true },
    });
    return p.id;
  }
  await ensureProduct('motor-washer', 'مروحة غسالة', 'مروحة غسالة أصلية', 1450, 12, 'active');
  await ensureProduct('water-pump', 'مضخة مياه', 'مضخة تصريف مياه', 320, 25, 'active');
  await ensureProduct('ac-filter', 'فلتر تكييف', 'فلتر تكييف قابل للغسل', 75, 0, 'suspended');

  // ------------------------------------------------------------- subscriptions
  async function ensureSubscription(userId, planId, status) {
    const existing = await prisma.subscription.findFirst({ where: { userId, planId } });
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    if (existing) {
      return prisma.subscription.update({
        where: { id: existing.id },
        data: { status, startedAt: now, currentPeriodStart: now, currentPeriodEnd: periodEnd },
      });
    }
    return prisma.subscription.create({
      data: { userId, planId, status, startedAt: now, currentPeriodStart: now, currentPeriodEnd: periodEnd },
    });
  }
  await ensureSubscription(customerId, planCustomer.id, 'active');
  await ensureSubscription(merchantId, planMerchant.id, 'active');
  await ensureSubscription(technicianId, planTechnician.id, 'active');

  // ------------------------------------------------------------- service requests
  // User-facing Egyptian titles only — no QA markers. Idempotency matches on
  // the human title; a legacy `QA-SEED:<key>` row is migrated in place so a
  // development label can never reach the UI.
  const legacyMarker = (k) => `QA-SEED:${k}`;
  async function ensureRequest(key, title, data) {
    let existing = await prisma.serviceRequest.findFirst({
      where: { customerId, problemTitle: title },
      select: { id: true },
    });
    if (!existing) {
      existing = await prisma.serviceRequest.findFirst({
        where: { customerId, problemTitle: legacyMarker(key) },
        select: { id: true },
      });
    }
    const payload = { customerId, problemTitle: title, ...data };
    if (existing) {
      await prisma.serviceRequest.update({ where: { id: existing.id }, data: payload });
      return existing.id;
    }
    const r = await prisma.serviceRequest.create({ data: payload, select: { id: true } });
    return r.id;
  }

  const baseReq = {
    applianceCategoryId: catWash.id,
    serviceId: svcWash.id,
    locationId: locHome,
    problemDescription: 'الغسالة لا تدور أثناء العصر ويصدر صوت مرتفع.',
    estimatedPriceFrom: 100,
    estimatedPriceTo: 250,
  };

  const nowMs = Date.now();
  const daysAgo = (n) => new Date(nowMs - n * 24 * 3600 * 1000);

  const reqPending = await ensureRequest('pending', 'صيانة غسالة لا تعصر', {
    ...baseReq,
    technicianId: prof1.id,
    faultId: faultNoSpin.id,
    status: 'pending',
    createdAt: daysAgo(1),
  });
  const reqAccepted = await ensureRequest('accepted', 'فحص تسرب مياه من الغسالة', {
    ...baseReq,
    technicianId: prof1.id,
    faultId: faultLeak.id,
    status: 'accepted',
    createdAt: daysAgo(3),
    acceptedAt: daysAgo(2),
  });
  const reqOnTheWay = await ensureRequest('on_the_way', 'غسالة تصدر صوتًا مرتفعًا', {
    ...baseReq,
    technicianId: prof1.id,
    faultId: faultNoise.id,
    status: 'on_the_way',
    createdAt: daysAgo(4),
    acceptedAt: daysAgo(3),
    startedAt: daysAgo(2),
  });
  const reqInProgress = await ensureRequest('in_progress', 'ثلاجة لا تبرد بشكل كافٍ', {
    ...baseReq,
    technicianId: prof1.id,
    serviceId: svcFridge.id,
    applianceCategoryId: catFridge.id,
    faultId: faultFridge.id,
    status: 'in_progress',
    createdAt: daysAgo(5),
    acceptedAt: daysAgo(4),
    startedAt: daysAgo(3),
  });
  const reqCompleted = await ensureRequest('completed', 'صيانة غسالة', {
    ...baseReq,
    technicianId: prof1.id,
    status: 'completed',
    finalPrice: 200,
    createdAt: daysAgo(12),
    acceptedAt: daysAgo(11),
    startedAt: daysAgo(10),
    completedAt: daysAgo(9),
  });
  const reqCancelled = await ensureRequest('cancelled', 'طلب صيانة غسالة', {
    ...baseReq,
    technicianId: prof1.id,
    status: 'cancelled',
    createdAt: daysAgo(7),
    cancelledAt: daysAgo(6),
  });
  // Unassigned pending request (technician-side "open requests" pool).
  const reqOpen = await ensureRequest('open', 'غسالة لا تدور أثناء العصر', {
    ...baseReq,
    technicianId: null,
    faultId: faultNoSpin.id,
    status: 'pending',
    createdAt: daysAgo(0),
  });
  // Unavailable-technician request: assigned to prof2 (unavailable).
  const reqUnavailable = await ensureRequest('tech_unavailable', 'تكييف لا يبرد', {
    ...baseReq,
    applianceCategoryId: catAc.id,
    serviceId: svcAc.id,
    faultId: faultAc.id,
    technicianId: prof2.id,
    status: 'pending',
    createdAt: daysAgo(0),
  });

  // status history (best-effort, only if empty for the request)
  async function ensureHistory(requestId, entries) {
    const count = await prisma.serviceRequestStatusHistory.count({ where: { serviceRequestId: requestId } });
    if (count > 0) return;
    for (const e of entries) {
      await prisma.serviceRequestStatusHistory.create({
        data: {
          serviceRequestId: requestId,
          fromStatus: e.from ?? null,
          toStatus: e.to,
          changedByUserId: e.by ?? null,
          createdAt: e.at,
        },
      });
    }
  }
  await ensureHistory(reqPending, [{ to: 'pending', by: customerId, at: daysAgo(1) }]);
  await ensureHistory(reqAccepted, [
    { to: 'pending', by: customerId, at: daysAgo(3) },
    { from: 'pending', to: 'accepted', by: technicianId, at: daysAgo(2) },
  ]);
  await ensureHistory(reqOnTheWay, [
    { to: 'pending', by: customerId, at: daysAgo(4) },
    { from: 'pending', to: 'accepted', by: technicianId, at: daysAgo(3) },
    { from: 'accepted', to: 'on_the_way', by: technicianId, at: daysAgo(2) },
  ]);
  await ensureHistory(reqInProgress, [
    { to: 'pending', by: customerId, at: daysAgo(5) },
    { from: 'pending', to: 'accepted', by: technicianId, at: daysAgo(4) },
    { from: 'accepted', to: 'on_the_way', by: technicianId, at: daysAgo(3) },
    { from: 'on_the_way', to: 'in_progress', by: technicianId, at: daysAgo(3) },
  ]);
  await ensureHistory(reqCompleted, [
    { to: 'pending', by: customerId, at: daysAgo(12) },
    { from: 'pending', to: 'accepted', by: technicianId, at: daysAgo(11) },
    { from: 'accepted', to: 'on_the_way', by: technicianId, at: daysAgo(10) },
    { from: 'on_the_way', to: 'in_progress', by: technicianId, at: daysAgo(10) },
    { from: 'in_progress', to: 'completed', by: technicianId, at: daysAgo(9) },
  ]);
  await ensureHistory(reqCancelled, [
    { to: 'pending', by: customerId, at: daysAgo(7) },
    { from: 'pending', to: 'cancelled', by: customerId, at: daysAgo(6) },
  ]);
  await ensureHistory(reqOpen, [{ to: 'pending', by: customerId, at: daysAgo(0) }]);
  await ensureHistory(reqUnavailable, [{ to: 'pending', by: customerId, at: daysAgo(0) }]);

  // ------------------------------------------------- data-quality guard
  // Never let a QA marker, a raw enum label, or a corrupted (question-mark)
  // string reach a user-facing field. Idempotent; only rewrites bad rows.
  const CLEAN_TITLE = 'طلب صيانة';
  const CLEAN_DESC = 'الغسالة لا تدور أثناء العصر ويصدر صوت مرتفع.';
  for (const needle of ['QA-SEED:', 'QA-E2E-', 'QA-RUN', 'طلب تجريبي']) {
    await prisma.serviceRequest.updateMany({
      where: { problemTitle: { contains: needle } },
      data: { problemTitle: CLEAN_TITLE },
    });
    await prisma.serviceRequest.updateMany({
      where: { problemDescription: { contains: needle } },
      data: { problemDescription: CLEAN_DESC },
    });
  }
  for (const needle of ['QA admin override', 'QA cancel path', 'QA reject path', 'QA second request', 'اختبار الجودة', 'QA automated', 'QA-run', 'was not spinning']) {
    await prisma.serviceRequest.updateMany({
      where: { problemDescription: { contains: needle } },
      data: { problemDescription: CLEAN_DESC },
    });
    await prisma.serviceRequest.updateMany({
      where: { problemTitle: { contains: needle } },
      data: { problemTitle: CLEAN_TITLE },
    });
  }
  // Corrupted non-UTF8 (question-mark) strings → clean Arabic.
  await prisma.serviceRequest.updateMany({ where: { problemTitle: { contains: '?' } }, data: { problemTitle: CLEAN_TITLE } });
  await prisma.serviceRequest.updateMany({ where: { problemDescription: { contains: '?' } }, data: { problemDescription: CLEAN_DESC } });
  // Legacy Saudi / corrupted locations → Egyptian.
  await prisma.location.updateMany({ where: { label: { contains: '?' } }, data: { label: 'المنزل', addressText: 'مدينة نصر', city: 'القاهرة' } });
  await prisma.location.updateMany({ where: { city: { in: ['الرياض', 'جدة', 'الدمام', 'مكة'] } }, data: { city: 'القاهرة' } });
  await prisma.location.updateMany({ where: { addressText: { contains: 'الرياض' } }, data: { addressText: 'مدينة نصر' } });
  await prisma.location.updateMany({ where: { addressText: { contains: 'جدة' } }, data: { addressText: 'الدقي' } });
  // Egyptian market currency (correct legacy SAR plans).
  await prisma.subscriptionPlan.updateMany({ where: { currency: 'SAR' }, data: { currency: 'EGP' } });

  // ------------------------------------------------------------------- review
  await prisma.review.upsert({
    where: { serviceRequestId: reqCompleted },
    update: { rating: 5, comment: 'خدمة سريعة واحترافية، شكرًا.' },
    create: {
      serviceRequestId: reqCompleted,
      customerId,
      technicianId: prof1.id,
      rating: 5,
      comment: 'خدمة سريعة واحترافية، شكرًا.',
      problemResolved: true,
    },
  });
  await prisma.technicianProfile.update({
    where: { id: prof1.id },
    data: { ratingAverage: 5, ratingCount: 1, completedServicesCount: 1 },
  });

  const tagFast = await prisma.reviewTag.upsert({
    where: { code: 'fast_service' },
    update: { isActive: true },
    create: { code: 'fast_service', labelAr: 'خدمة سريعة' },
  });
  const completedReview = await prisma.review.findUnique({ where: { serviceRequestId: reqCompleted } });
  if (completedReview) {
    await prisma.reviewTagAssignment.upsert({
      where: { reviewId_tagId: { reviewId: completedReview.id, tagId: tagFast.id } },
      update: {},
      create: { reviewId: completedReview.id, tagId: tagFast.id },
    });
  }

  // --------------------------------------------------------------- chat
  async function ensureConversation(requestId, participants, messages) {
    let conv = await prisma.conversation.findUnique({ where: { serviceRequestId: requestId } });
    if (!conv) {
      conv = await prisma.conversation.create({ data: { serviceRequestId: requestId } });
    }
    for (const p of participants) {
      await prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conv.id, userId: p.userId } },
        update: { roleSnapshot: p.role },
        create: { conversationId: conv.id, userId: p.userId, roleSnapshot: p.role },
      });
    }
    const count = await prisma.message.count({ where: { conversationId: conv.id } });
    if (count === 0) {
      for (const m of messages) {
        await prisma.message.create({
          data: { conversationId: conv.id, senderUserId: m.senderUserId, messageType: 'text', body: m.body, createdAt: m.at },
        });
      }
    }
    return conv.id;
  }
  await ensureConversation(
    reqAccepted,
    [
      { userId: customerId, role: 'customer' },
      { userId: technicianId, role: 'technician' },
    ],
    [
      { senderUserId: customerId, body: 'من فضلك تعال قبل الساعة الخامسة.', at: daysAgo(2) },
      { senderUserId: technicianId, body: 'تمام، سأصل قريبًا.', at: daysAgo(2) },
    ],
  );

  // ---------------------------------------------------------- notifications
  async function ensureNotification(userId, type, titleAr, bodyAr, at) {
    const existing = await prisma.notification.findFirst({ where: { userId, type, titleAr } });
    if (existing) return existing.id;
    const n = await prisma.notification.create({
      data: { userId, type, titleAr, bodyAr, dataJson: { qa: true }, createdAt: at },
      select: { id: true },
    });
    return n.id;
  }
  await ensureNotification(customerId, 'service_request.accepted', 'تم قبول طلبك', 'قبل الفني طلبك وسيتواصل معك.', daysAgo(2));
  await ensureNotification(customerId, 'service_request.completed', 'اكتمل الطلب', 'تم إكمال طلبك، يمكنك التقييم الآن.', daysAgo(9));
  await ensureNotification(technicianId, 'service_request.created', 'طلب جديد', 'لديك طلب خدمة جديد.', daysAgo(1));
  await ensureNotification(merchantId, 'subscription.active', 'تم تنشيط الاشتراك', 'اشتراكك نشط الآن.', daysAgo(5));

  // --------------------------------------------------- pending payment (admin)
  const existingSubmission = await prisma.paymentSubmission.findFirst({
    where: { userId: customerId, status: 'pending', transferReference: 'TRF-2026-100001' },
  });
  if (!existingSubmission) {
    await prisma.paymentSubmission.create({
      data: {
        userId: customerId,
        planId: planCustomer.id,
        method: 'instapay',
        transferReference: 'TRF-2026-100001',
        status: 'pending',
      },
    });
  }
  const existingRejected = await prisma.paymentSubmission.findFirst({
    where: { userId: merchantId, status: 'rejected', transferReference: 'TRF-2026-100002' },
  });
  if (!existingRejected) {
    await prisma.paymentSubmission.create({
      data: {
        userId: merchantId,
        planId: planMerchant.id,
        method: 'vodafone_cash',
        transferReference: 'TRF-2026-100002',
        status: 'rejected',
        reviewedByAdminId: adminId,
        reviewedAt: daysAgo(4),
      },
    });
  }

  const ids = {
    clientVersion: 'qa-seed-1',
    customer: { id: customerId, email: EMAIL.customer },
    technician: { id: technicianId, profileId: prof1.id, email: EMAIL.technician },
    technician2: { id: technician2Id, profileId: prof2.id, email: EMAIL.technician2 },
    merchant: { id: merchantId, profileId: merchantProfile.id, email: EMAIL.merchant },
    admin: { id: adminId, email: EMAIL.admin },
    categories: { washing: catWash.id, refrigerator: catFridge.id, ac: catAc.id, dishwasher: catDish.id },
    locations: { home: locHome },
    requests: { pending: reqPending, accepted: reqAccepted, onTheWay: reqOnTheWay, inProgress: reqInProgress, completed: reqCompleted, cancelled: reqCancelled, open: reqOpen, techUnavailable: reqUnavailable },
    plans: { customer: planCustomer.id, merchant: planMerchant.id, technician: planTechnician.id },
  };
  console.log('QA_SEED_OK ' + JSON.stringify(ids));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('QA_SEED_FAILED', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
