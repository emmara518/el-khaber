/**
 * WP-2B: admin verification-decision notifications.
 *
 * Proves the new `verification` notification type: exactly one notification
 * per decision for the affected user, with the approved Arabic copy, and
 * NO notification for `pending` / unchanged / unauthorized / invalid input.
 * Bootstraps the compiled app against the in-memory FakePrisma client.
 */

import { createRequire } from 'node:module';

import { Test } from '@nestjs/testing';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../dist/app.module';
import { getConfig } from '../dist/config/app.config';

import { createFakePrisma, type FakePrismaClient } from './fake-prisma';

import type { INestApplication } from '@nestjs/common';

const requireCjs = createRequire(import.meta.url);
const { PrismaService } = requireCjs('../dist/database/prisma.service') as {
  PrismaService: new (...args: unknown[]) => unknown;
};
const { hashPassword } = requireCjs('../dist/auth/password') as {
  hashPassword: (plain: string) => Promise<string>;
};

const PASSWORD = 'sup3rsecretP4ss';
const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_EMAIL = 'admin@khabir.test';

const VERIFIED_COPY = 'تم اعتماد حسابك بنجاح.';
const REJECTED_COPY = 'لم يتم اعتماد طلب التحقق. راجع البيانات وأعد المحاولة.';
const SUSPENDED_COPY = 'تم تعليق حالة التحقق لحسابك.';

let seq = 0;
function uid(): string {
  seq += 1;
  return `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
}

describe('admin verification notifications (WP-2B)', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;
  let adminToken = '';

  beforeAll(async () => {
    const dbUrl = process.env['DATABASE_URL'] ?? '';
    if (/supabase\.com|supabase\.co/i.test(dbUrl)) {
      throw new Error(
        'E2E database safety: a real Supabase URL is configured. The e2e suite uses the in-memory FakePrismaClient and must NOT run against a real database.',
      );
    }

    process.env['NODE_ENV'] = 'test';
    process.env['PORT'] = '0';
    process.env['API_GLOBAL_PREFIX'] = 'api/v1';
    process.env['CORS_ORIGINS'] = '';
    process.env['DATABASE_URL'] = 'postgresql://test/test';
    process.env['DIRECT_URL'] = 'postgresql://test/test';
    process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-test-access-secret-32';
    process.env['JWT_ACCESS_TTL'] = '900';
    process.env['JWT_REFRESH_TTL'] = '2592000';
    process.env['JWT_ISSUER'] = 'khabir-api';
    process.env['JWT_AUDIENCE'] = 'khabir';
    process.env['ADMIN_JWT_ACCESS_SECRET'] = 'test-admin-secret-test-admin-secret-32';
    process.env['ADMIN_JWT_ACCESS_TTL'] = '900';
    process.env['ADMIN_JWT_REFRESH_TTL'] = '2592000';
    process.env['ADMIN_JWT_ISSUER'] = 'khabir-admin-api';
    process.env['ADMIN_JWT_AUDIENCE'] = 'khabir-admin';
    process.env['RATE_LIMIT_TTL'] = '60';
    process.env['RATE_LIMIT_MAX'] = '1000';
    process.env['AUTH_RATE_LIMIT_MAX'] = '1000';

    prisma = createFakePrisma();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(getConfig().globalPrefix);
    await app.init();
  });

  beforeEach(async () => {
    prisma.users.length = 0;
    prisma.refreshTokens.length = 0;
    prisma.adminUsers.length = 0;
    prisma.adminRefreshTokens.length = 0;
    prisma.technicianProfiles.length = 0;
    prisma.merchantProfiles.length = 0;
    prisma.auditLogRows.length = 0;
    prisma.notificationRows.length = 0;
    seq = 0;

    prisma.adminUsers.push({
      id: ADMIN_ID,
      email: ADMIN_EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      role: 'super_admin',
      status: 'active',
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD })
      .expect(200);
    adminToken = login.body.data.accessToken as string;
  });

  function seedTechnicianProfile(userId: string, status = 'pending'): string {
    const id = uid();
    prisma.technicianProfiles.push({
      id,
      userId,
      displayName: 'فني',
      bio: null,
      avatarUrl: null,
      verificationStatus: status,
      availabilityStatus: 'unavailable',
      experienceYears: 0,
      completedServicesCount: 0,
      ratingAverage: null,
      ratingCount: 0,
    } as never);
    return id;
  }

  function seedMerchantProfile(userId: string, status = 'pending'): string {
    const id = uid();
    prisma.merchantProfiles.push({
      id,
      userId,
      businessName: 'متجر',
      bio: null,
      logoUrl: null,
      verificationStatus: status,
      contactPhone: null,
      locationId: null,
    } as never);
    return id;
  }

  function verifyTechnician(profileId: string, status: string) {
    return request(app.getHttpServer())
      .post(`/api/v1/admin/technicians/${profileId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status });
  }
  function verifyMerchant(profileId: string, status: string) {
    return request(app.getHttpServer())
      .post(`/api/v1/admin/merchants/${profileId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status });
  }
  const notesFor = (userId: string) => prisma.notificationRows.filter((n) => n.userId === userId);

  it('VERIFIED → exactly one verification notification with the exact copy', async () => {
    const techId = seedTechnicianProfile('tech-verified', 'pending');
    await verifyTechnician(techId, 'verified').expect(200);

    const notes = notesFor('tech-verified');
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe('verification');
    expect(notes[0].titleAr).toBe(VERIFIED_COPY);
    expect(notes[0].bodyAr).toBe(VERIFIED_COPY);
    expect(notes[0].readAt).toBeNull();
  });

  it('REJECTED → exactly one verification notification with the exact copy', async () => {
    const techId = seedTechnicianProfile('tech-rejected', 'pending');
    await verifyTechnician(techId, 'rejected').expect(200);

    const notes = notesFor('tech-rejected');
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe('verification');
    expect(notes[0].titleAr).toBe(REJECTED_COPY);
    expect(notes[0].bodyAr).toBe(REJECTED_COPY);
  });

  it('SUSPENDED → exactly one verification notification with the exact copy', async () => {
    const techId = seedTechnicianProfile('tech-suspended', 'verified');
    await verifyTechnician(techId, 'suspended').expect(200);

    const notes = notesFor('tech-suspended');
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe('verification');
    expect(notes[0].titleAr).toBe(SUSPENDED_COPY);
    expect(notes[0].bodyAr).toBe(SUSPENDED_COPY);
  });

  it('PENDING never notifies', async () => {
    const techId = seedTechnicianProfile('tech-pending', 'verified');
    await verifyTechnician(techId, 'pending').expect(200);
    expect(notesFor('tech-pending')).toHaveLength(0);
  });

  it('an unchanged/duplicate decision is rejected and adds no notification', async () => {
    const techId = seedTechnicianProfile('tech-dup', 'pending');
    await verifyTechnician(techId, 'verified').expect(200);
    const dup = await verifyTechnician(techId, 'verified');
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('CONFLICT');
    expect(notesFor('tech-dup')).toHaveLength(1);
  });

  it('notifies the MERCHANT with the correct recipient and type', async () => {
    const merchantId = seedMerchantProfile('merchant-1', 'pending');
    await verifyMerchant(merchantId, 'verified').expect(200);
    const notes = notesFor('merchant-1');
    expect(notes).toHaveLength(1);
    expect(notes[0].type).toBe('verification');
    expect(notes[0].titleAr).toBe(VERIFIED_COPY);
  });

  it('creates NO notification for unauthorized or invalid requests', async () => {
    const techId = seedTechnicianProfile('tech-guard', 'pending');

    // Unauthorized: no admin token.
    const anon = await request(app.getHttpServer())
      .post(`/api/v1/admin/technicians/${techId}/verification`)
      .send({ status: 'verified' });
    expect(anon.status).toBe(401);

    // Invalid status value: rejected by validation.
    const invalid = await verifyTechnician(techId, 'bogus');
    expect(invalid.status).toBe(400);

    expect(prisma.notificationRows).toHaveLength(0);
  });
});
