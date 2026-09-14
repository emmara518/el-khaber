/**
 * QA seed for the isolated khabir_test database (native APK QA).
 * Creates baseline catalog + one account per role + admin, all with known
 * passwords, so the real Android app can be exercised end-to-end.
 * Safe: only touches the local khabir_test database (never shared/dev/prod).
 */
import { PrismaClient } from '@prisma/client';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { hashPassword } = require('../dist/auth/password');

const url = process.env.DATABASE_URL;
if (!url || !/khabir_test/.test(url)) {
  throw new Error('Refusing to seed: DATABASE_URL must point at khabir_test');
}
const prisma = new PrismaClient({ datasources: { db: { url } } });
const PASSWORD = 'sup3rsecretP4ss';

async function upsertUser(email, role) {
  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing) return existing.id;
  const u = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(PASSWORD), role, status: 'active' },
    select: { id: true },
  });
  return u.id;
}

async function main() {
  // Catalog
  const cat = await prisma.applianceCategory.upsert({
    where: { slug: 'washing_machine' },
    update: {},
    create: { nameAr: 'غسالات', slug: 'washing_machine', isActive: true, sortOrder: 1 },
  });
  await prisma.applianceCategory.upsert({
    where: { slug: 'refrigerator' },
    update: {},
    create: { nameAr: 'ثلاجات', slug: 'refrigerator', isActive: true, sortOrder: 2 },
  });
  await prisma.applianceCategory.upsert({
    where: { slug: 'air_conditioner' },
    update: {},
    create: { nameAr: 'تكييفات', slug: 'air_conditioner', isActive: true, sortOrder: 3 },
  });
  const service = await prisma.service.upsert({
    where: { applianceCategoryId_slug: { applianceCategoryId: cat.id, slug: 'washing_repair' } },
    update: {},
    create: {
      applianceCategoryId: cat.id,
      nameAr: 'صيانة غسالات',
      slug: 'washing_repair',
      isActive: true,
      sortOrder: 1,
    },
  });
  await prisma.fault.upsert({
    where: { applianceCategoryId_slug: { applianceCategoryId: cat.id, slug: 'no_spin' } },
    update: {},
    create: {
      applianceCategoryId: cat.id,
      nameAr: 'الغسالة لا تدور',
      slug: 'no_spin',
      summaryAr: 'الغسالة لا تدور أثناء العصر',
      guidanceAr: 'تحقق من الكهرباء',
      publishStatus: 'published',
    },
  });
  await prisma.fault.upsert({
    where: { applianceCategoryId_slug: { applianceCategoryId: cat.id, slug: 'leak' } },
    update: {},
    create: {
      applianceCategoryId: cat.id,
      nameAr: 'تسرب مياه',
      slug: 'leak',
      summaryAr: 'تسرب مياه من أسفل الغسالة',
      guidanceAr: 'افحص الخراطيم',
      publishStatus: 'published',
    },
  });

  // Entitlement + customer plan + payment methods
  const ent = await prisma.entitlement.upsert({
    where: { code: 'priority_support' },
    update: { isActive: true },
    create: { code: 'priority_support', nameAr: 'دعم ذو أولوية', featureGroup: 'support' },
  });
  const plan = await prisma.subscriptionPlan.upsert({
    where: { role_code: { role: 'customer', code: 'platinum' } },
    update: { isActive: true },
    create: {
      role: 'customer',
      code: 'platinum',
      nameAr: 'بلاتينيوم',
      nameEn: 'Platinum',
      billingInterval: 'monthly',
      price: 99,
      currency: 'SAR',
      isActive: true,
      sortOrder: 2,
    },
  });
  await prisma.planEntitlement.upsert({
    where: { planId_entitlementId: { planId: plan.id, entitlementId: ent.id } },
    update: {},
    create: { planId: plan.id, entitlementId: ent.id },
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

  // Accounts
  const customerId = await upsertUser('customer@qa.local', 'customer');
  const technicianId = await upsertUser('technician@qa.local', 'technician');
  const merchantId = await upsertUser('merchant@qa.local', 'merchant');
  const adminExisting = await prisma.adminUser.findFirst({ where: { email: 'admin@qa.local' } });
  if (!adminExisting) {
    await prisma.adminUser.create({
      data: {
        email: 'admin@qa.local',
        passwordHash: await hashPassword(PASSWORD),
        role: 'super_admin',
        status: 'active',
      },
    });
  }

  // Customer location
  const existingLoc = await prisma.location.findFirst({ where: { userId: customerId } });
  if (!existingLoc) {
    await prisma.location.create({
      data: { userId: customerId, label: 'المنزل', addressText: 'الرياض – حي النزهة', city: 'الرياض', latitude: 24.7, longitude: 46.7 },
    });
  }

  // Technician profile (verified, with a service) so discovery works
  let profile = await prisma.technicianProfile.findFirst({ where: { userId: technicianId } });
  if (!profile) {
    profile = await prisma.technicianProfile.create({
      data: {
        userId: technicianId,
        displayName: 'فني الخبير',
        bio: 'فني معتمد لصيانة الغسالات',
        verificationStatus: 'verified',
        availabilityStatus: 'available',
        experienceYears: 6,
      },
    });
  } else if (profile.verificationStatus !== 'verified') {
    profile = await prisma.technicianProfile.update({
      where: { id: profile.id },
      data: { verificationStatus: 'verified', availabilityStatus: 'available' },
    });
  }
  const hasSvc = await prisma.technicianService.findFirst({
    where: { technicianId: profile.id, serviceId: service.id },
  });
  if (!hasSvc) {
    await prisma.technicianService.create({
      data: { technicianId: profile.id, serviceId: service.id, isActive: true },
    });
  }

  // Merchant profile
  const mProfile = await prisma.merchantProfile.findFirst({ where: { userId: merchantId } });
  if (!mProfile) {
    await prisma.merchantProfile.create({
      data: { userId: merchantId, businessName: 'متجر الخبير', verificationStatus: 'pending' },
    });
  }

  console.log('QA seed OK', JSON.stringify({ customerId, technicianId, merchantId, plan: plan.id, profile: profile.id }));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('SEED FAILED', e.message);
  process.exit(1);
});
