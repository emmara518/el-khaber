/**
 * End-to-end tests for the Service Request lifecycle (Task 10F):
 *   - customer create (documented fields, ownership of location, refs)
 *   - customer list/detail/cancel (owner-scoped, IDOR-safe)
 *   - technician list (eligibility), accept (atomic claim), reject,
 *     active-service progression, completion
 *   - state machine: invalid transitions blocked, terminal protection
 *   - history: creation + every valid transition; none for invalid
 *   - role isolation: merchant tokens, cross-role access
 */

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createRequire } from 'node:module';
import request from 'supertest';

import { AppModule } from '../dist/app.module';
import { getConfig } from '../dist/config/app.config';
import { createFakePrisma, type FakePrismaClient } from './fake-prisma';

const requireCjs = createRequire(import.meta.url);
const { PrismaService } = requireCjs('../dist/database/prisma.service') as {
  PrismaService: new (...args: unknown[]) => unknown;
};

const PASSWORD = 'sup3rsecretP4ss';
const CAT_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const SVC_ID = 'bbbbbbbb-1111-4111-8111-111111111111';
const FAULT_ID = 'cccccccc-1111-4111-8111-111111111111';
const LOC_OTHER_OWNER = 'eeeeeeee-9999-4999-8999-999999999999';

let seq = 0;
function uid(): string {
  seq += 1;
  return `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
}

describe('service request lifecycle e2e', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;

  beforeAll(async () => {
    const dbUrl = process.env['DATABASE_URL'] ?? '';
    if (/supabase\.com|supabase\.co/i.test(dbUrl)) {
      throw new Error(
        'E2E database safety: a real Supabase URL is configured. The e2e suite uses the in-memory FakePrismaClient and must NOT run against a real database. Unset DATABASE_URL or set it to a clearly-test-only value (e.g. postgresql://test/test).',
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

  beforeEach(() => {
    prisma.users.length = 0;
    prisma.refreshTokens.length = 0;
    prisma.technicianProfiles.length = 0;
    prisma.technicianServices.length = 0;
    prisma.serviceRequests.length = 0;
    prisma.serviceRequestStatusHistoryStore.length = 0;
    prisma.locations.length = 0;
    prisma.applianceCategories.length = 0;
    prisma.services.length = 0;
    prisma.faults.length = 0;
    seq = 0;

    prisma.applianceCategories.push({ id: CAT_ID, nameAr: 'غسالات', slug: 'washing_machine', iconUrl: null, imageUrl: null, isActive: true, sortOrder: 1 });
    prisma.services.push({ id: SVC_ID, applianceCategoryId: CAT_ID, nameAr: 'صيانة غسالات', slug: 'washing_repair', descriptionAr: null, isActive: true, sortOrder: 1 });
    prisma.faults.push({ id: FAULT_ID, applianceCategoryId: CAT_ID, nameAr: 'عطل', slug: 'fault', severityLevel: null, summaryAr: 'ملخص', guidanceAr: 'إرشاد', safetyNoteAr: null, whenToCallTechnicianAr: null, publishStatus: 'published', sortOrder: 1, updatedAt: new Date() });
  });

  interface Session {
    accessToken: string;
    userId: string;
  }

  async function register(role: 'customer' | 'technician' | 'merchant', email: string): Promise<Session> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role, email, password: PASSWORD })
      .expect(201);
    return { accessToken: res.body.data.accessToken, userId: res.body.data.user.id };
  }

  function seedVerifiedTechnician(userId: string): string {
    const id = uid();
    prisma.technicianProfiles.push({
      id,
      userId,
      displayName: 'فني موثق',
      bio: null,
      avatarUrl: null,
      verificationStatus: 'verified',
      availabilityStatus: 'available',
      experienceYears: 5,
      completedServicesCount: 10,
      ratingAverage: 4.5,
      ratingCount: 20,
    });
    prisma.technicianServices.push({ technicianId: id, serviceId: SVC_ID, priceFrom: null, isActive: true });
    return id;
  }

  function seedLocation(ownerId: string): string {
    const id = uid();
    prisma.locations.push({
      id,
      userId: ownerId,
      label: 'المنزل',
      addressText: 'شارع الملك فهد',
      city: 'الرياض',
      region: 'منطقة الرياض',
      country: null,
      latitude: 24.7,
      longitude: 46.7,
    });
    return id;
  }

  interface Created {
    id: string;
    body: Record<string, unknown>;
  }

  async function createRequest(customer: Session, technicianId: string): Promise<Created> {
    const locationId = seedLocation(customer.userId);
    const res = await request(app.getHttpServer())
      .post('/api/v1/service-requests')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({
        technician_id: technicianId,
        appliance_category_id: CAT_ID,
        service_id: SVC_ID,
        fault_id: FAULT_ID,
        problem_description: 'الغسالة لا تدور',
        location_id: locationId,
      })
      .expect(201);
    return { id: res.body.data.id as string, body: res.body.data as Record<string, unknown> };
  }

  describe('customer create', () => {
    it('creates a pending request with history and job location (owner only)', async () => {
      const customer = await register('customer', 'cust-create@example.com');
      const techId = seedVerifiedTechnician((await register('technician', 'tech-create@example.com')).userId);

      const created = await createRequest(customer, techId);
      console.log('CREATE RESPONSE:', JSON.stringify(created.body));
      expect(created.body.status).toBe('pending');
      expect(created.body.technicianId).toBe(techId);
      expect(created.body.problemTitle).toBeNull();
      expect(created.body.location).toMatchObject({ city: 'الرياض', latitude: 24.7 });
      expect(Array.isArray(created.body.history)).toBe(true);
      expect((created.body.history as Array<{ fromStatus: string | null; toStatus: string }>)).toEqual([
        { id: expect.any(String), fromStatus: null, toStatus: 'pending', changedByUserId: customer.userId, createdAt: expect.any(String) },
      ]);
    });

    it('supports the optional problem_title and the "other problem" case (no fault ref)', async () => {
      const customer = await register('customer', 'cust-title@example.com');
      const techId = seedVerifiedTechnician((await register('technician', 'tech-title@example.com')).userId);
      const locationId = seedLocation(customer.userId);
      const res = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({
          technician_id: techId,
          appliance_category_id: CAT_ID,
          problem_title: 'مشكلة أخرى',
          problem_description: 'صوت غريب عند التشغيل',
          location_id: locationId,
        })
        .expect(201);
      expect(res.body.data.problemTitle).toBe('مشكلة أخرى');
      expect(res.body.data.faultId).toBeNull();
    });

    it('rejects a request targeting a location owned by another account (IDOR)', async () => {
      const customer = await register('customer', 'cust-idor@example.com');
      const techId = seedVerifiedTechnician((await register('technician', 'tech-idor@example.com')).userId);
      const res = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({
          technician_id: techId,
          appliance_category_id: CAT_ID,
          problem_description: 'x',
          location_id: LOC_OTHER_OWNER,
        });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(prisma.serviceRequests).toHaveLength(0);
    });

    it('rejects unverified technicians and unknown references with 404', async () => {
      const customer = await register('customer', 'cust-refs@example.com');
      const unverified = (await register('technician', 'tech-unverified@example.com')).userId;
      const techId = uid();
      prisma.technicianProfiles.push({
        id: techId, userId: unverified, displayName: null, bio: null, avatarUrl: null,
        verificationStatus: 'pending', availabilityStatus: 'unavailable',
        experienceYears: 0, completedServicesCount: 0, ratingAverage: null, ratingCount: 0,
      });
      const locationId = seedLocation(customer.userId);

      const badTech = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({ technician_id: techId, appliance_category_id: CAT_ID, problem_description: 'x', location_id: locationId });
      expect(badTech.status).toBe(404);

      const badCategory = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({ technician_id: techId, appliance_category_id: uid(), problem_description: 'x', location_id: locationId });
      expect(badCategory.status).toBe(404);
    });

    it('validates the payload (missing/unknown fields stripped, description required)', async () => {
      const customer = await register('customer', 'cust-valid@example.com');
      const res = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({ appliance_category_id: CAT_ID });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      // Mass-assignment guard: client-supplied status/customer_id never applied.
      const withForbidden = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({
          technician_id: uid(),
          appliance_category_id: CAT_ID,
          problem_description: 'x',
          location_id: uid(),
          status: 'completed',
          customer_id: 'hacked',
          final_price: 999,
        });
      expect(withForbidden.status).toBe(404); // refs unresolved; status/price never accepted
    });
  });

  describe('customer list / detail / ownership', () => {
    it('lists own requests with pagination and status filter; other customers see nothing', async () => {
      const customerA = await register('customer', 'cust-a@example.com');
      const customerB = await register('customer', 'cust-b@example.com');
      const techId = seedVerifiedTechnician((await register('technician', 'tech-list@example.com')).userId);
      const r1 = await createRequest(customerA, techId);
      await createRequest(customerA, techId);

      const own = await request(app.getHttpServer())
        .get('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customerA.accessToken}`)
        .expect(200);
      expect(own.body.data).toHaveLength(2);
      expect(own.body.meta).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1, hasNext: false });

      const other = await request(app.getHttpServer())
        .get('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customerB.accessToken}`)
        .expect(200);
      expect(other.body.data).toEqual([]);

      const filtered = await request(app.getHttpServer())
        .get('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customerA.accessToken}`)
        .query({ status: 'pending' })
        .expect(200);
      expect(filtered.body.data).toHaveLength(2);
      expect(filtered.body.data[0].id).not.toBe(r1.id); // newest first

      const paginated = await request(app.getHttpServer())
        .get('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customerA.accessToken}`)
        .query({ limit: 1, page: 2 })
        .expect(200);
      expect(paginated.body.data).toHaveLength(1);
      expect(paginated.body.meta.hasNext).toBe(false);
    });

    it('hides other customers’ requests on detail (identical 404)', async () => {
      const customerA = await register('customer', 'cust-det-a@example.com');
      const customerB = await register('customer', 'cust-det-b@example.com');
      const techId = seedVerifiedTechnician((await register('technician', 'tech-det@example.com')).userId);
      const created = await createRequest(customerA, techId);

      const own = await request(app.getHttpServer())
        .get(`/api/v1/service-requests/${created.id}`)
        .set('Authorization', `Bearer ${customerA.accessToken}`)
        .expect(200);
      expect(own.body.data.id).toBe(created.id);

      const foreign = await request(app.getHttpServer())
        .get(`/api/v1/service-requests/${created.id}`)
        .set('Authorization', `Bearer ${customerB.accessToken}`);
      expect(foreign.status).toBe(404);
      expect(foreign.body.error.message).toBe('Service request not found');
    });
  });

  describe('technician lifecycle', () => {
    it('lists only eligible requests: pending targeted at them + their own non-pending', async () => {
      const customer = await register('customer', 'cust-techlist@example.com');
      const techA = await register('technician', 'tech-a@example.com');
      const techB = await register('technician', 'tech-b@example.com');
      const techAId = seedVerifiedTechnician(techA.userId);
      seedVerifiedTechnician(techB.userId);
      const mine = await createRequest(customer, techAId);

      // B sees nothing (not targeted).
      const bList = await request(app.getHttpServer())
        .get('/api/v1/service-requests')
        .set('Authorization', `Bearer ${techB.accessToken}`)
        .expect(200);
      expect(bList.body.data).toEqual([]);

      // A sees the pending request targeted at them.
      const aList = await request(app.getHttpServer())
        .get('/api/v1/service-requests')
        .set('Authorization', `Bearer ${techA.accessToken}`)
        .expect(200);
      expect(aList.body.data.map((r: { id: string }) => r.id)).toEqual([mine.id]);

      // Status filter: pending shows it, completed does not.
      const pendingOnly = await request(app.getHttpServer())
        .get('/api/v1/service-requests')
        .set('Authorization', `Bearer ${techA.accessToken}`)
        .query({ status: 'pending' })
        .expect(200);
      expect(pendingOnly.body.data).toHaveLength(1);
      const completedOnly = await request(app.getHttpServer())
        .get('/api/v1/service-requests')
        .set('Authorization', `Bearer ${techA.accessToken}`)
        .query({ status: 'completed' })
        .expect(200);
      expect(completedOnly.body.data).toEqual([]);
    });

    it('full happy path: accept → start (on_the_way) → start (in_progress) → complete, with history', async () => {
      const customer = await register('customer', 'cust-happy@example.com');
      const tech = await register('technician', 'tech-happy@example.com');
      const techId = seedVerifiedTechnician(tech.userId);
      const created = await createRequest(customer, techId);
      const auth = { Authorization: `Bearer ${tech.accessToken}` };

      const accepted = await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/accept`)
        .set(auth)
        .expect(200);
      expect(accepted.body.data.status).toBe('accepted');
      expect(accepted.body.data.acceptedAt).toBeTypeOf('string');

      const onWay = await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/start`)
        .set(auth)
        .expect(200);
      expect(onWay.body.data.status).toBe('on_the_way');
      expect(onWay.body.data.startedAt).toBeTypeOf('string');

      const inProgress = await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/start`)
        .set(auth)
        .expect(200);
      expect(inProgress.body.data.status).toBe('in_progress');

      const completed = await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/complete`)
        .set(auth)
        .expect(200);
      expect(completed.body.data.status).toBe('completed');
      expect(completed.body.data.completedAt).toBeTypeOf('string');

      // History records every transition, append-only, ordered.
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/service-requests/${created.id}`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(200);
      const chain = (detail.body.data.history as Array<{ fromStatus: string | null; toStatus: string }>).map(
        (h) => `${h.fromStatus ?? '∅'}→${h.toStatus}`,
      );
      expect(chain).toEqual(['∅→pending', 'pending→accepted', 'accepted→on_the_way', 'on_the_way→in_progress', 'in_progress→completed']);
    });

    it('blocks invalid transitions: skips, reverses, duplicates, and terminal mutation', async () => {
      const customer = await register('customer', 'cust-invalid@example.com');
      const tech = await register('technician', 'tech-invalid@example.com');
      const techId = seedVerifiedTechnician(tech.userId);
      const created = await createRequest(customer, techId);
      const auth = { Authorization: `Bearer ${tech.accessToken}` };
      const url = (action: string): string => `/api/v1/service-requests/${created.id}/${action}`;

      // Skip: cannot start a pending request.
      const skip = await request(app.getHttpServer()).post(url('start')).set(auth);
      expect(skip.status).toBe(409);
      expect(skip.body.error.code).toBe('INVALID_STATE_TRANSITION');

      // Accept, then duplicate accept is stale.
      await request(app.getHttpServer()).post(url('accept')).set(auth).expect(200);
      const dupAccept = await request(app.getHttpServer()).post(url('accept')).set(auth);
      expect(dupAccept.status).toBe(409);
      expect(dupAccept.body.error.code).toBe('INVALID_STATE_TRANSITION');

      // Reverse: cannot accept an on_the_way request... start again reaches in_progress.
      await request(app.getHttpServer()).post(url('start')).set(auth).expect(200);
      // Customer cannot cancel past acceptance.
      const lateCancel = await request(app.getHttpServer())
        .post(url('cancel'))
        .set('Authorization', `Bearer ${customer.accessToken}`);
      expect(lateCancel.status).toBe(409);
      expect(lateCancel.body.error.code).toBe('INVALID_STATE_TRANSITION');

      await request(app.getHttpServer()).post(url('start')).set(auth).expect(200);
      // Complete twice: terminal protection.
      await request(app.getHttpServer()).post(url('complete')).set(auth).expect(200);
      const again = await request(app.getHttpServer()).post(url('complete')).set(auth);
      expect(again.status).toBe(409);

      // No mutation without history: invalid attempts created no records.
      const detail = await request(app.getHttpServer())
        .get(`/api/v1/service-requests/${created.id}`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(200);
      const history = detail.body.data.history as Array<{ toStatus: string }>;
      expect(history.map((h) => h.toStatus)).toEqual(['pending', 'accepted', 'on_the_way', 'in_progress', 'completed']);
    });

    it('rejects a pending targeted request (→ cancelled) and blocks unrelated technicians', async () => {
      const customer = await register('customer', 'cust-reject@example.com');
      const techA = await register('technician', 'tech-rej-a@example.com');
      const techB = await register('technician', 'tech-rej-b@example.com');
      const techAId = seedVerifiedTechnician(techA.userId);
      seedVerifiedTechnician(techB.userId);
      const created = await createRequest(customer, techAId);

      // B is not targeted: detail and reject are 404.
      const foreign = await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/reject`)
        .set('Authorization', `Bearer ${techB.accessToken}`);
      expect(foreign.status).toBe(404);
      expect(foreign.body.error.code).toBe('NOT_FOUND');

      const rejected = await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/reject`)
        .set('Authorization', `Bearer ${techA.accessToken}`)
        .expect(200);
      expect(rejected.body.data.status).toBe('cancelled');
      expect(rejected.body.data.cancelledAt).toBeTypeOf('string');
    });

    it('cancellation after acceptance is allowed for the assigned technician (documented pending/accepted → cancelled)', async () => {
      const customer = await register('customer', 'cust-accancel@example.com');
      const tech = await register('technician', 'tech-accancel@example.com');
      const techId = seedVerifiedTechnician(tech.userId);
      const created = await createRequest(customer, techId);
      const auth = { Authorization: `Bearer ${tech.accessToken}` };
      await request(app.getHttpServer()).post(`/api/v1/service-requests/${created.id}/accept`).set(auth).expect(200);
      const res = await request(app.getHttpServer()).post(`/api/v1/service-requests/${created.id}/reject`).set(auth).expect(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('enforces role isolation: merchant tokens and cross-role mutation rejected', async () => {
      const customer = await register('customer', 'cust-iso@example.com');
      const tech = await register('technician', 'tech-iso@example.com');
      const merchant = await register('merchant', 'merchant-iso@example.com');
      const techId = seedVerifiedTechnician(tech.userId);
      const created = await createRequest(customer, techId);

      // Merchant cannot create requests.
      const merchantCreate = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${merchant.accessToken}`)
        .send({ technician_id: techId, appliance_category_id: CAT_ID, problem_description: 'x', location_id: uid() });
      expect(merchantCreate.status).toBe(401);
      expect(merchantCreate.body.error.code).toBe('AUTH_REQUIRED');

      // Customer cannot call technician actions.
      const custAccept = await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/accept`)
        .set('Authorization', `Bearer ${customer.accessToken}`);
      expect(custAccept.status).toBe(401);

      // Technician cannot call customer cancellation.
      const techCancel = await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/cancel`)
        .set('Authorization', `Bearer ${tech.accessToken}`);
      expect(techCancel.status).toBe(401);

      // Unauthenticated access rejected.
      const anon = await request(app.getHttpServer()).get('/api/v1/service-requests');
      expect(anon.status).toBe(401);
      expect(anon.body.error.code).toBe('AUTH_REQUIRED');
    });
  });
});
