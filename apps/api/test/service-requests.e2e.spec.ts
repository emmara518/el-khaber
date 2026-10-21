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
const { STORAGE_PORT } = requireCjs('../dist/storage/storage.port') as {
  STORAGE_PORT: string;
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

  // In-memory StoragePort for the media suite (Track B2): the test acts as
  // the client PUT by writing into `objects` with the granted key.
  const objects = new Map<string, { bytes: Uint8Array; mimeType: string }>();
  const memoryStorage = {
    provider: 'local' as const,
    presignPut: async (key: string, mimeType: string) => ({
      url: `memory://${key}`,
      key,
      expiresInSeconds: 300,
      requiredHeaders: { 'Content-Type': mimeType },
      maxBytes: 5 * 1024 * 1024,
    }),
    presignGet: async (key: string) => ({
      url: `memory://${key}`,
      key,
      expiresInSeconds: 300,
    }),
    head: async (key: string) => {
      const object = objects.get(key);
      return object === undefined
        ? { exists: false, sizeBytes: null, mimeType: null }
        : { exists: true, sizeBytes: object.bytes.length, mimeType: object.mimeType };
    },
    readPrefix: async (key: string, maxBytes: number) =>
      objects.get(key)?.bytes.slice(0, maxBytes) ?? null,
    delete: async (key: string) => {
      objects.delete(key);
    },
  };

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
      .overrideProvider(STORAGE_PORT)
      .useValue(memoryStorage)
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
    prisma.serviceRequestMediaRows.length = 0;
    objects.clear();
    prisma.notificationRows.length = 0;
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
      addressText: 'شارع عباس العقاد',
      city: 'القاهرة',
      region: 'القاهرة',
      country: null,
      latitude: 30.04,
      longitude: 31.24,
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
      expect(created.body.location).toMatchObject({ city: 'القاهرة', latitude: 30.04 });
      expect(Array.isArray(created.body.history)).toBe(true);
      expect((created.body.history as Array<{ fromStatus: string | null; toStatus: string }>)).toEqual([
        { id: expect.any(String), fromStatus: null, toStatus: 'pending', changedByUserId: customer.userId, createdAt: expect.any(String) },
      ]);
    });

    it('returns null coordinates for a label-only location (never 0,0)', async () => {
      const customer = await register('customer', 'cust-null-coords@example.com');
      const techId = seedVerifiedTechnician(
        (await register('technician', 'tech-null-coords@example.com')).userId,
      );
      const locationId = uid();
      prisma.locations.push({
        id: locationId,
        userId: customer.userId,
        label: 'المنزل',
        addressText: 'شارع عباس العقاد',
        city: 'القاهرة',
        region: 'القاهرة',
        country: null,
        latitude: null,
        longitude: null,
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({
          technician_id: techId,
          appliance_category_id: CAT_ID,
          service_id: SVC_ID,
          problem_description: 'الغسالة لا تدور',
          location_id: locationId,
        })
        .expect(201);

      expect(res.body.data.location.latitude).toBeNull();
      expect(res.body.data.location.longitude).toBeNull();
      expect(res.body.data.location.addressText).toBe('شارع عباس العقاد');

      const detail = await request(app.getHttpServer())
        .get(`/api/v1/service-requests/${String(res.body.data.id)}`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(200);
      expect(detail.body.data.location.latitude).toBeNull();
      expect(detail.body.data.location.longitude).toBeNull();
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

    it('stores an optional PREFERRED appointment within the 14-day window (Track B1)', async () => {
      const customer = await register('customer', 'cust-preferred@example.com');
      const techId = seedVerifiedTechnician((await register('technician', 'tech-preferred@example.com')).userId);
      const locationId = seedLocation(customer.userId);
      const preferred = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      preferred.setMinutes(0, 0, 0);
      const res = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({
          technician_id: techId,
          appliance_category_id: CAT_ID,
          problem_description: 'الغسالة لا تدور',
          location_id: locationId,
          scheduled_at: preferred.toISOString(),
        })
        .expect(201);
      expect(res.body.data.scheduledAt).toBe(preferred.toISOString());
    });

    it('rejects a preferred appointment in the past (400, field-scoped)', async () => {
      const customer = await register('customer', 'cust-preferred-past@example.com');
      const techId = seedVerifiedTechnician((await register('technician', 'tech-preferred-past@example.com')).userId);
      const locationId = seedLocation(customer.userId);
      const res = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({
          technician_id: techId,
          appliance_category_id: CAT_ID,
          problem_description: 'الغسالة لا تدور',
          location_id: locationId,
          scheduled_at: new Date(Date.now() - 60_000).toISOString(),
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.scheduled_at).toBeDefined();
      expect(prisma.serviceRequests).toHaveLength(0);
    });

    it('rejects a preferred appointment beyond 14 days (400) and never books', async () => {
      const customer = await register('customer', 'cust-preferred-far@example.com');
      const techId = seedVerifiedTechnician((await register('technician', 'tech-preferred-far@example.com')).userId);
      const locationId = seedLocation(customer.userId);
      const res = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({
          technician_id: techId,
          appliance_category_id: CAT_ID,
          problem_description: 'الغسالة لا تدور',
          location_id: locationId,
          scheduled_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.fields.scheduled_at).toContain('14');
      expect(prisma.serviceRequests).toHaveLength(0);
    });

    it('rejects a request targeting a location owned by another account (IDOR)', async () => {      const customer = await register('customer', 'cust-idor@example.com');
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

  describe('creation notification (WP-2A)', () => {
    it('notifies the targeted technician exactly once when a request is created', async () => {
      const customer = await register('customer', 'cust-create-notif@example.com');
      const tech = await register('technician', 'tech-create-notif@example.com');
      const techId = seedVerifiedTechnician(tech.userId);

      await createRequest(customer, techId);

      const techNotes = prisma.notificationRows.filter((n) => n.userId === tech.userId);
      expect(techNotes).toHaveLength(1);
      expect(techNotes[0].type).toBe('request_status');
      expect(techNotes[0].titleAr).toBe('طلب خدمة جديد');
      expect(techNotes[0].readAt).toBeNull();
      // Creation notifies the technician only — never the acting customer.
      expect(prisma.notificationRows.filter((n) => n.userId === customer.userId)).toHaveLength(0);
    });

    it('emits one notification per created request (no duplicate/aggregation)', async () => {
      const customer = await register('customer', 'cust-create-notif2@example.com');
      const tech = await register('technician', 'tech-create-notif2@example.com');
      const techId = seedVerifiedTechnician(tech.userId);

      await createRequest(customer, techId);
      await createRequest(customer, techId);

      expect(prisma.notificationRows.filter((n) => n.userId === tech.userId)).toHaveLength(2);
    });

    it('creates NO notification when creation is rejected (unauthorized / invalid ref)', async () => {
      const customer = await register('customer', 'cust-create-none@example.com');
      const locationId = seedLocation(customer.userId);

      // Unauthorized (anonymous) is rejected before any write.
      const anon = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .send({ technician_id: uid(), appliance_category_id: CAT_ID, problem_description: 'x', location_id: locationId });
      expect(anon.status).toBe(401);

      // Invalid reference: 404, still no notification.
      const bad = await request(app.getHttpServer())
        .post('/api/v1/service-requests')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .send({ technician_id: uid(), appliance_category_id: CAT_ID, problem_description: 'x', location_id: locationId });
      expect(bad.status).toBe(404);

      expect(prisma.notificationRows).toHaveLength(0);
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
      // Regression (P0-1): the list summary carries the job location, so list
      // views need no per-row detail fetch (no N+1 waterfall / burst / 429).
      expect(aList.body.data[0].location).toEqual({
        label: 'المنزل',
        addressText: 'شارع عباس العقاد',
        city: 'القاهرة',
      });

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

  describe('business event notifications (Task 10M)', () => {
    it('notifies the CUSTOMER on every technician transition (counterparty only, unread)', async () => {
      const customer = await register('customer', 'cust-notif@example.com');
      const tech = await register('technician', 'tech-notif@example.com');
      const techId = seedVerifiedTechnician(tech.userId);
      const created = await createRequest(customer, techId);
      const auth = { Authorization: `Bearer ${tech.accessToken}` };
      const notesFor = (userId: string) => prisma.notificationRows.filter((n) => n.userId === userId);

      await request(app.getHttpServer()).post(`/api/v1/service-requests/${created.id}/accept`).set(auth).expect(200);
      let notes = notesFor(customer.userId);
      expect(notes).toHaveLength(1);
      expect(notes[0].type).toBe('request_status');
      expect(notes[0].titleAr).toBe('تم قبول طلب الخدمة');
      expect(notes[0].readAt).toBeNull();
      // The technician received only the creation notice — never their
      // own transition actions (WP-2A).
      expect(notesFor(tech.userId).map((n) => n.titleAr)).toEqual(['طلب خدمة جديد']);

      await request(app.getHttpServer()).post(`/api/v1/service-requests/${created.id}/start`).set(auth).expect(200);
      await request(app.getHttpServer()).post(`/api/v1/service-requests/${created.id}/start`).set(auth).expect(200);
      await request(app.getHttpServer()).post(`/api/v1/service-requests/${created.id}/complete`).set(auth).expect(200);

      notes = notesFor(customer.userId);
      expect(notes.map((n) => n.titleAr)).toEqual([
        'تم قبول طلب الخدمة',
        'الفني في الطريق',
        'بدأ تنفيذ الخدمة',
        'تم إكمال الخدمة',
      ]);
      // Every transition produced exactly one persisted row; no phantom rows.
      expect(notes).toHaveLength(4);
    });

    it('notifies the assigned TECHNICIAN when the customer cancels (server-derived recipient)', async () => {
      const customer = await register('customer', 'cust-cancel-notif@example.com');
      const tech = await register('technician', 'tech-cancel-notif@example.com');
      const techId = seedVerifiedTechnician(tech.userId);
      const created = await createRequest(customer, techId);

      await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/cancel`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(200);

      const techNotes = prisma.notificationRows.filter((n) => n.userId === tech.userId);
      // Creation notice (WP-2A) + the cancellation notice.
      expect(techNotes.map((n) => n.titleAr)).toEqual(['طلب خدمة جديد', 'تم إلغاء طلب الخدمة']);
      expect(techNotes.every((n) => n.type === 'request_status')).toBe(true);
      // The cancelling customer is not the recipient of their own action.
      expect(prisma.notificationRows.filter((n) => n.userId === customer.userId)).toHaveLength(0);
    });

    it('creates NO notification when the business action is rejected (stale / invalid / unauthorized)', async () => {
      const customer = await register('customer', 'cust-stale-notif@example.com');
      const tech = await register('technician', 'tech-stale-notif@example.com');
      const merchant = await register('merchant', 'merchant-stale-notif@example.com');
      const techId = seedVerifiedTechnician(tech.userId);
      const created = await createRequest(customer, techId);
      const auth = { Authorization: `Bearer ${tech.accessToken}` };
      const url = (action: string): string => `/api/v1/service-requests/${created.id}/${action}`;

      // Invalid transition on a fresh pending request: skip to start.
      const skip = await request(app.getHttpServer()).post(url('start')).set(auth);
      expect(skip.status).toBe(409);
      expect(prisma.notificationRows.filter((n) => n.userId === customer.userId)).toHaveLength(0);

      // Duplicate accept: first succeeds (1 notification), second is stale.
      await request(app.getHttpServer()).post(url('accept')).set(auth).expect(200);
      const dup = await request(app.getHttpServer()).post(url('accept')).set(auth);
      expect(dup.status).toBe(409);
      expect(prisma.notificationRows.filter((n) => n.userId === customer.userId)).toHaveLength(1);

      // Unauthorized actor (merchant / cross-role) is rejected before any write.
      const unauthorized = await request(app.getHttpServer())
        .post(url('complete'))
        .set('Authorization', `Bearer ${merchant.accessToken}`);
      expect(unauthorized.status).toBe(401);
      expect(prisma.notificationRows.filter((n) => n.userId === customer.userId)).toHaveLength(1);
    });
  });

  describe('request media (Track B2)', () => {
    const PNG_BYTES = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);

    it('owner uploads a photo; participants list and view it without storage keys', async () => {
      const customer = await register('customer', 'cust-media@example.com');
      const tech = await register('technician', 'tech-media@example.com');
      const techId = seedVerifiedTechnician(tech.userId);
      const created = await createRequest(customer, techId);
      const authCustomer = { Authorization: `Bearer ${customer.accessToken}` };

      const grant = await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/media/upload-url`)
        .set(authCustomer)
        .send({ mime_type: 'image/png' })
        .expect(200);
      const key = grant.body.data.storageKey as string;
      expect(key.startsWith(`request-media/${customer.userId}/${created.id}/`)).toBe(true);
      expect(key.endsWith('.png')).toBe(true);
      expect(grant.body.data.uploadUrl).toBe(`memory://${key}`);

      // Simulate the client PUT to the presigned URL.
      objects.set(key, { bytes: PNG_BYTES, mimeType: 'image/png' });

      const confirmed = await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/media/confirm`)
        .set(authCustomer)
        .send({ storage_key: key })
        .expect(201);
      const mediaId = confirmed.body.data.id as string;
      expect(confirmed.body.data).toMatchObject({
        id: mediaId,
        mimeType: 'image/png',
        fileSize: PNG_BYTES.length,
      });

      const list = await request(app.getHttpServer())
        .get(`/api/v1/service-requests/${created.id}/media`)
        .set(authCustomer)
        .expect(200);
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0]).toMatchObject({ id: mediaId, mimeType: 'image/png' });
      expect(list.body.data[0].storageKey).toBeUndefined();

      const techAuth = { Authorization: `Bearer ${tech.accessToken}` };
      const techList = await request(app.getHttpServer())
        .get(`/api/v1/service-requests/${created.id}/media`)
        .set(techAuth)
        .expect(200);
      expect(techList.body.data).toHaveLength(1);

      const view = await request(app.getHttpServer())
        .get(`/api/v1/service-requests/${created.id}/media/${mediaId}/url`)
        .set(techAuth)
        .expect(200);
      expect(view.body.data).toMatchObject({ mediaId, downloadUrl: `memory://${key}` });

      const actions = prisma.auditLogRows.map((row) => row.action);
      expect(actions).toEqual(
        expect.arrayContaining([
          'user.service_request.media_upload_url',
          'user.service_request.media_confirm',
          'user.service_request.media_view',
        ]),
      );
    });

    it('rejects foreign uploads, foreign keys, outsider reads, and role mismatches', async () => {
      const owner = await register('customer', 'cust-media-idor@example.com');
      const stranger = await register('customer', 'cust-media-stranger@example.com');
      const tech = await register('technician', 'tech-media-idor@example.com');
      const merchant = await register('merchant', 'merchant-media@example.com');
      const techId = seedVerifiedTechnician(tech.userId);
      const created = await createRequest(owner, techId);
      const mediaUrl = `/api/v1/service-requests/${created.id}/media`;

      await request(app.getHttpServer())
        .post(`${mediaUrl}/upload-url`)
        .set({ Authorization: `Bearer ${stranger.accessToken}` })
        .send({ mime_type: 'image/png' })
        .expect(404);

      await request(app.getHttpServer())
        .post(`${mediaUrl}/upload-url`)
        .set({ Authorization: `Bearer ${merchant.accessToken}` })
        .send({ mime_type: 'image/png' })
        .expect(401);

      const foreignKey = `request-media/${stranger.userId}/${created.id}/123e4567-e89b-42d3-a456-426614174000.png`;
      const foreignConfirm = await request(app.getHttpServer())
        .post(`${mediaUrl}/confirm`)
        .set({ Authorization: `Bearer ${owner.accessToken}` })
        .send({ storage_key: foreignKey });
      expect(foreignConfirm.status).toBe(400);
      expect(foreignConfirm.body.error.code).toBe('UPLOAD_REJECTED');

      await request(app.getHttpServer())
        .get(mediaUrl)
        .set({ Authorization: `Bearer ${stranger.accessToken}` })
        .expect(404);
      expect(prisma.serviceRequestMediaRows).toHaveLength(0);
    });

    it('enforces the attachment limit and refuses cancelled requests', async () => {
      const customer = await register('customer', 'cust-media-limit@example.com');
      const tech = await register('technician', 'tech-media-limit@example.com');
      const techId = seedVerifiedTechnician(tech.userId);
      const created = await createRequest(customer, techId);
      const authCustomer = { Authorization: `Bearer ${customer.accessToken}` };
      const mediaUrl = `/api/v1/service-requests/${created.id}/media`;

      for (let i = 0; i < 5; i += 1) {
        prisma.serviceRequestMediaRows.push({
          id: uid(),
          serviceRequestId: created.id,
          uploadedByUserId: customer.userId,
          storageKey: `request-media/${customer.userId}/${created.id}/${uid()}.png`,
          mimeType: 'image/png',
          fileSize: 16,
          createdAt: new Date(),
        });
      }
      const atLimit = await request(app.getHttpServer())
        .post(`${mediaUrl}/upload-url`)
        .set(authCustomer)
        .send({ mime_type: 'image/png' });
      expect(atLimit.status).toBe(409);

      await request(app.getHttpServer())
        .post(`/api/v1/service-requests/${created.id}/cancel`)
        .set(authCustomer)
        .expect(200);
      const cancelled = await request(app.getHttpServer())
        .post(`${mediaUrl}/upload-url`)
        .set(authCustomer)
        .send({ mime_type: 'image/png' });
      expect(cancelled.status).toBe(409);
    });

    it('deletes a rejected upload (non-image content) instead of leaving an orphan', async () => {
      const customer = await register('customer', 'cust-media-cleanup@example.com');
      const tech = await register('technician', 'tech-media-cleanup@example.com');
      const techId = seedVerifiedTechnician(tech.userId);
      const created = await createRequest(customer, techId);
      const authCustomer = { Authorization: `Bearer ${customer.accessToken}` };
      const mediaUrl = `/api/v1/service-requests/${created.id}/media`;

      const grant = await request(app.getHttpServer())
        .post(`${mediaUrl}/upload-url`)
        .set(authCustomer)
        .send({ mime_type: 'image/png' })
        .expect(200);
      const key = grant.body.data.storageKey as string;
      objects.set(key, { bytes: PNG_BYTES, mimeType: 'application/pdf' });

      const rejected = await request(app.getHttpServer())
        .post(`${mediaUrl}/confirm`)
        .set(authCustomer)
        .send({ storage_key: key });
      expect(rejected.status).toBe(400);
      expect(rejected.body.error.code).toBe('UPLOAD_REJECTED');
      expect(objects.has(key)).toBe(false);
      expect(prisma.serviceRequestMediaRows).toHaveLength(0);
    });
  });
});
