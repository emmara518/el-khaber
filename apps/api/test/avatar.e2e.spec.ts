/**
 * End-to-end tests for profile images (WP-01):
 *   - customer POST/DELETE /me/avatar (multipart upload, idempotent delete)
 *   - technician POST/DELETE /technician/profile/avatar
 *   - merchant POST/DELETE /merchant/profile/logo
 *   - role isolation across the three upload routes (401, no leak)
 *   - text PATCH can no longer inject avatar_url/logoUrl (D2)
 *   - oversize / fake-image / missing-file rejections
 *   - public URL readability (local dev file route) + GET /me readback
 *
 * Runs against the in-memory FakePrismaClient (same harness as the
 * other e2e suites) with the REAL local avatar storage under
 * `.avatar-storage/` (git-ignored dev data). No network, no
 * credentials, no production systems.
 */

import { createRequire } from 'node:module';

import { Test } from '@nestjs/testing';
import sharp from 'sharp';
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

const PASSWORD = 'sup3rsecretP4ss';

// Real images generated with sharp (never hand-typed base64 — a corrupt
// fixture would fail decode for the wrong reason).
let PNG_1X1: Buffer;
let JPEG_1X1: Buffer;
const NOT_AN_IMAGE = Buffer.from('this is plain text, not image bytes ................');

describe('profile images e2e (WP-01)', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;

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
    process.env['RATE_LIMIT_TTL'] = '60';
    process.env['RATE_LIMIT_MAX'] = '1000';
    process.env['AUTH_RATE_LIMIT_MAX'] = '1000';

    prisma = createFakePrisma();

    PNG_1X1 = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 9, g: 9, b: 9 } },
    })
      .png()
      .toBuffer();
    JPEG_1X1 = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .jpeg()
      .toBuffer();

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
    prisma.customerProfiles.length = 0;
    prisma.technicianProfiles.length = 0;
    prisma.merchantProfiles.length = 0;
    prisma.auditLogRows.length = 0;
  });

  interface Session {
    accessToken: string;
    userId: string;
  }

  async function register(
    role: 'customer' | 'technician' | 'merchant',
    email: string,
  ): Promise<Session> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ role, email, password: PASSWORD })
      .expect(201);
    return { accessToken: res.body.data.accessToken, userId: res.body.data.user.id };
  }

  async function getMeAvatar(token: string): Promise<string | null> {
    const res = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return (res.body.data.avatarUrl as string | null) ?? null;
  }

  it('customer: upload → readback → download → replace → delete → delete-again', async () => {
    const session = await register('customer', 'avatar-c1@example.com');

    expect(await getMeAvatar(session.accessToken)).toBeNull();

    // Upload a PNG.
    const up1 = await request(app.getHttpServer())
      .post('/api/v1/me/avatar')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .attach('file', PNG_1X1, { filename: 'photo.png', contentType: 'image/png' })
      .expect(201);
    const url1 = up1.body.data.avatarUrl as string;
    expect(typeof url1).toBe('string');
    expect(url1).toContain('/avatars-file/avatars/');
    expect(url1.endsWith('.png')).toBe(true);

    // Readback through GET /me (public URL, never a storage key).
    expect(await getMeAvatar(session.accessToken)).toBe(url1);

    // The public URL is actually downloadable (local dev file route).
    const filePath = new URL(url1).pathname.replace(/^\/api\/v1\//, '/api/v1/');
    await request(app.getHttpServer())
      .get(filePath)
      .expect(200)
      .expect('Content-Type', /image\/png/);

    // Replace with a JPEG (re-encode keeps the sniffed type).
    const up2 = await request(app.getHttpServer())
      .post('/api/v1/me/avatar')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .attach('file', JPEG_1X1, { filename: 'evil-name.exe', contentType: 'image/jpeg' })
      .expect(201);
    const url2 = up2.body.data.avatarUrl as string;
    expect(url2).not.toBe(url1);
    expect(url2.endsWith('.jpg')).toBe(true);
    expect(await getMeAvatar(session.accessToken)).toBe(url2);

    // Delete is idempotent: twice → 204 both times, then null readback.
    await request(app.getHttpServer())
      .delete('/api/v1/me/avatar')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(204);
    expect(await getMeAvatar(session.accessToken)).toBeNull();
    await request(app.getHttpServer())
      .delete('/api/v1/me/avatar')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(204);
  });

  it('technician: upload binds the owned profile; text PATCH cannot inject avatar_url', async () => {
    const session = await register('technician', 'avatar-t1@example.com');

    const up = await request(app.getHttpServer())
      .post('/api/v1/technician/profile/avatar')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .attach('file', PNG_1X1, { filename: 'me.png', contentType: 'image/png' })
      .expect(201);
    expect((up.body.data.avatarUrl as string).endsWith('.png')).toBe(true);

    // D2: avatar_url is no longer a text-writable field — the schema
    // strips it, so this PATCH changes the name but NOT the photo.
    await request(app.getHttpServer())
      .patch('/api/v1/technician/profile')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ display_name: 'فني مختبر', avatar_url: 'https://evil.example.com/x.png' })
      .expect(200);
    const profile = await request(app.getHttpServer())
      .get('/api/v1/technician/profile')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(profile.body.data.displayName).toBe('فني مختبر');
    expect(profile.body.data.avatarUrl).toBe(up.body.data.avatarUrl);

    await request(app.getHttpServer())
      .delete('/api/v1/technician/profile/avatar')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(204);
  });

  it('merchant: upload binds the owned logo; text PATCH cannot inject logoUrl', async () => {
    const session = await register('merchant', 'avatar-m1@example.com');

    const up = await request(app.getHttpServer())
      .post('/api/v1/merchant/profile/logo')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .attach('file', PNG_1X1, { filename: 'logo.png', contentType: 'image/png' })
      .expect(201);
    expect((up.body.data.logoUrl as string).endsWith('.png')).toBe(true);

    await request(app.getHttpServer())
      .patch('/api/v1/merchant/profile')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ businessName: 'متجر مختبر', logoUrl: 'https://evil.example.com/logo.png' })
      .expect(200);
    const profile = await request(app.getHttpServer())
      .get('/api/v1/merchant/profile')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect(profile.body.data.businessName).toBe('متجر مختبر');
    expect(profile.body.data.logoUrl).toBe(up.body.data.logoUrl);

    await request(app.getHttpServer())
      .delete('/api/v1/merchant/profile/logo')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(204);
  });

  it('enforces role isolation: no role can touch another role route (401)', async () => {
    const customer = await register('customer', 'avatar-x1@example.com');
    const technician = await register('technician', 'avatar-x2@example.com');
    const merchant = await register('merchant', 'avatar-x3@example.com');

    const png = { filename: 'a.png', contentType: 'image/png' } as const;
    await request(app.getHttpServer())
      .post('/api/v1/technician/profile/avatar')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .attach('file', PNG_1X1, png)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/merchant/profile/logo')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .attach('file', PNG_1X1, png)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/me/avatar')
      .set('Authorization', `Bearer ${technician.accessToken}`)
      .attach('file', PNG_1X1, png)
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/me/avatar')
      .set('Authorization', `Bearer ${merchant.accessToken}`)
      .attach('file', PNG_1X1, png)
      .expect(401);
    await request(app.getHttpServer()).post('/api/v1/me/avatar').expect(401);
  });

  it('rejects missing file (400), fake image bytes (400), and oversize uploads (413)', async () => {
    const session = await register('customer', 'avatar-x4@example.com');
    const auth = { Authorization: `Bearer ${session.accessToken}` };

    await request(app.getHttpServer()).post('/api/v1/me/avatar').set(auth).expect(400);

    const fake = await request(app.getHttpServer())
      .post('/api/v1/me/avatar')
      .set(auth)
      .attach('file', NOT_AN_IMAGE, { filename: 'x.png', contentType: 'image/png' })
      .expect(400);
    expect(fake.body.error.code).toBe('UPLOAD_REJECTED');

    const big = Buffer.alloc(2 * 1024 * 1024 + 1, 0);
    const over = await request(app.getHttpServer())
      .post('/api/v1/me/avatar')
      .set(auth)
      .attach('file', big, { filename: 'big.png', contentType: 'image/png' })
      .expect(413);
    expect(over.body.error.code).toBe('UPLOAD_REJECTED');

    // Nothing was persisted by the rejected uploads.
    expect(await getMeAvatar(session.accessToken)).toBeNull();
  });
});
