const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const plan = await p.subscriptionPlan.upsert({
    where: { role_code: { role: 'merchant', code: 'basic' } },
    update: { isActive: true },
    create: {
      role: 'merchant',
      code: 'basic',
      nameAr: 'باقة التاجر الأساسية',
      nameEn: 'Merchant Basic',
      billingInterval: 'monthly',
      price: 49,
      currency: 'SAR',
      isActive: true,
      sortOrder: 1,
    },
  });
  console.log('MERCHANT PLAN:', plan.id, plan.code);
  await p.$disconnect();
}
main();
