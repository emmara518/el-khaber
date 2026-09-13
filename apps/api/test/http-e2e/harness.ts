/**
 * Real-HTTP E2E harness (Task 10N).
 *
 * Boots the REAL NestJS application (compiled from `dist`) with the REAL
 * Prisma client connected to the isolated `khabir_test` PostgreSQL/PostGIS
 * database. Requests travel over HTTP through guards, validation, services,
 * and Prisma — nothing is mocked.
 *
 * The module fails closed at import time if the environment is not the
 * dedicated test database (see ./env.ts).
 */

import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';

import { AppModule } from '../../dist/app.module';
import { hashPassword } from '../../dist/auth/password';
import { getConfig } from '../../dist/config/app.config';

import { assertTestDatabaseIdentity, resolveTestDatabaseUrl } from './env';

import type { INestApplication } from '@nestjs/common';

// Resolve + pin the isolated test environment BEFORE any module reads config.
export const TEST_DB = resolveTestDatabaseUrl();

process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = TEST_DB.url;
process.env['DIRECT_URL'] = TEST_DB.url;
process.env['PORT'] = '0';
process.env['API_GLOBAL_PREFIX'] = 'api/v1';
process.env['CORS_ORIGINS'] = '';
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-test-access-secret-32';
process.env['JWT_ACCESS_TTL'] = '900';
process.env['JWT_REFRESH_TTL'] = '2592000';
process.env['JWT_ISSUER'] = 'khabir-api';
process.env['JWT_AUDIENCE'] = 'khabir';
process.env['ADMIN_JWT_ACCESS_SECRET'] = 'test-admin-secret-test-admin-secret-32';
process.env['ADMIN_JWT_ISSUER'] = 'khabir-admin-api';
process.env['ADMIN_JWT_AUDIENCE'] = 'khabir-admin';
process.env['RATE_LIMIT_TTL'] = '60';
// High limits so the E2E payload never trips the throttle; throttling itself
// is covered by dedicated unit tests.
process.env['RATE_LIMIT_MAX'] = '100000';
process.env['AUTH_RATE_LIMIT_MAX'] = '100000';
process.env['AUTH_MAX_FAILED_LOGINS'] = '5';
process.env['AUTH_FAILURE_LOCK_SECONDS'] = '900';

export const PASSWORD = 'sup3rsecretP4ss';
export const base = '/api/v1';

/**
 * Fixture/assertion client. A standalone Prisma client pointed at the SAME
 * isolated test database as the running app. It is used only for test
 * setup/teardown and persistence assertions — never to bypass HTTP.
 */
export type TestPrisma = PrismaClient;

export interface HttpTestContext {
  app: INestApplication;
  prisma: TestPrisma;
  close(): Promise<void>;
}

export async function createHttpTestApp(): Promise<HttpTestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix(getConfig().globalPrefix);
  await app.init();

  const prisma = new PrismaClient({ datasources: { db: { url: TEST_DB.url } } });
  await prisma.$connect();
  // Fail closed if we are somehow not on the provisioned test database.
  await assertTestDatabaseIdentity(prisma as never);

  return {
    app,
    prisma,
    async close() {
      await prisma.$disconnect();
      await app.close();
    },
  };
}

const ALL_TABLES = [
  'audit_logs',
  'notifications',
  'entitlement_grants',
  'payment_submissions',
  'payment_method_configs',
  'plan_entitlements',
  'entitlements',
  'subscription_plans',
  'subscriptions',
  'messages',
  'conversation_participants',
  'conversations',
  'review_tag_assignments',
  'reviews',
  'review_tags',
  'service_request_media',
  'service_request_status_history',
  'service_requests',
  'products',
  'favorites',
  'technician_services',
  'technician_service_areas',
  'technician_profiles',
  'merchant_profiles',
  'customer_profiles',
  'locations',
  'fault_service_links',
  'faults',
  'services',
  'appliance_categories',
  'refresh_tokens',
  'password_reset_tokens',
  'admin_refresh_tokens',
  'users',
  'admin_users',
];

/** Wipes all application data in the ISOLATED test database (never the marker). */
export async function resetDatabase(prisma: TestPrisma): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${ALL_TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}

export interface BaselineIds {
  categoryId: string;
  serviceId: string;
  faultId: string;
  planId: string;
  entitlementId: string;
}

/** Seeds the minimum catalog/commercial baseline the flows require. */
export async function seedBaseline(prisma: TestPrisma): Promise<BaselineIds> {
  const category = await prisma.applianceCategory.create({
    data: { nameAr: 'غسالات', slug: 'washing-machine', isActive: true, sortOrder: 1 },
  });
  const service = await prisma.service.create({
    data: { applianceCategoryId: category.id, nameAr: 'صيانة غسالات', slug: 'washing-repair', isActive: true, sortOrder: 1 },
  });
  const fault = await prisma.fault.create({
    data: {
      applianceCategoryId: category.id,
      nameAr: 'لا تدور',
      slug: 'no-spin',
      summaryAr: 'الغسالة لا تدور',
      guidanceAr: 'تحقق من الكهرباء',
      publishStatus: 'published',
    },
  });
  const entitlement = await prisma.entitlement.create({
    data: { code: 'priority_support', nameAr: 'دعم ذو أولوية', featureGroup: 'support', isActive: true },
  });
  const plan = await prisma.subscriptionPlan.create({
    data: {
      role: 'customer',
      code: 'customer-platinum',
      nameAr: 'بلاتينيوم',
      billingInterval: 'monthly',
      price: 99,
      currency: 'SAR',
      isActive: true,
    },
  });
  await prisma.planEntitlement.create({ data: { planId: plan.id, entitlementId: entitlement.id } });
  await prisma.paymentMethodConfig.create({
    data: { method: 'instapay', accountIdentifier: 'khabir@instapay', displayName: 'الخبير', isEnabled: true },
  });
  await prisma.paymentMethodConfig.create({
    data: { method: 'vodafone_cash', accountIdentifier: '01000000000', displayName: 'الخبير', isEnabled: true },
  });
  return { categoryId: category.id, serviceId: service.id, faultId: fault.id, planId: plan.id, entitlementId: entitlement.id };
}

export async function seedAdmin(prisma: TestPrisma, email: string): Promise<string> {
  const admin = await prisma.adminUser.create({
    data: {
      email,
      passwordHash: await hashPassword(PASSWORD),
      role: 'super_admin',
      status: 'active',
    },
  });
  return admin.id;
}

export interface Session {
  accessToken: string;
  refreshToken?: string;
  userId: string;
}
