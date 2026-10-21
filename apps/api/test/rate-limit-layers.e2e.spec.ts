/**
 * S2: request throttling + layered failed-login protection.
 *
 * Proves:
 *   - the general per-IP budget (120/min default) does not block normal
 *     traffic (50 sequential GETs are allowed);
 *   - the auth endpoint budget (10/min) rejects the 11th request, and this
 *     is independent from password failure counters;
 *   - failed logins from IP A do not lock the account for IP B;
 *   - the per-IP layer blocks a different account from the same host;
 *   - the per-account layer locks distributed brute force (20 failures
 *     across 20 IPs);
 *   - with TRUST_PROXY_HOPS=1, only the rightmost X-Forwarded-For entry is
 *     trusted, so left-padded spoofing cannot bypass the lock.
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

const PASSWORD = 'sup3rsecretP4ss';
let emailSeq = 0;

describe('rate limiting layers (S2)', () => {
  let app: INestApplication;
  let prisma: FakePrismaClient;

  beforeAll(async () => {
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
    process.env['RATE_LIMIT_MAX'] = '120';
    process.env['AUTH_RATE_LIMIT_MAX'] = '10';
    process.env['AUTH_LOGIN_IP_MAX'] = '5';
    process.env['AUTH_LOGIN_IP_TTL'] = '900';
    process.env['AUTH_LOGIN_USER_MAX'] = '20';
    process.env['AUTH_LOGIN_USER_TTL'] = '3600';
    process.env['AUTH_MAX_FAILED_LOGINS'] = '5';
    process.env['AUTH_FAILURE_LOCK_SECONDS'] = '900';
    process.env['TRUST_PROXY_HOPS'] = '1';

    prisma = createFakePrisma();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(getConfig().globalPrefix);
    // main.ts applies this in production; e2e builds the app directly.
    app.getHttpAdapter().getInstance().set('trust proxy', 1);
    await app.init();
  });

  beforeEach(() => {
    prisma.users.length = 0;
    prisma.refreshTokens.length = 0;
    prisma.rateLimitBuckets.length = 0;
    emailSeq += 1;
  });

  async function register(email: string, ip: string): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', ip)
      .send({ role: 'customer', email, password: PASSWORD })
      .expect(201);
  }

  function login(email: string, ip: string, password = PASSWORD) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email, password });
  }

  it('allows 50 normal GETs from one IP without a 429', async () => {
    const ip = '203.0.113.1';
    for (let i = 0; i < 50; i += 1) {
      const res = await request(app.getHttpServer())
        .get('/api/v1/health')
        .set('X-Forwarded-For', ip);
      expect(res.status).not.toBe(429);
    }
  });

  it('rejects the 11th auth request in a minute (auth policy, not password failure)', async () => {
    const ip = '203.0.113.2';
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('X-Forwarded-For', ip)
        .send({ refreshToken: 'x'.repeat(32) });
      expect(res.status).not.toBe(429);
    }
    const eleventh = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('X-Forwarded-For', ip)
      .send({ refreshToken: 'x'.repeat(32) });
    expect(eleventh.status).toBe(429);
  });

  it('failures from IP A do not lock the account for IP B', async () => {
    const email = `lock-a-${emailSeq}@example.com`;
    await register(email, '203.0.113.10');

    for (let i = 0; i < 5; i += 1) {
      const res = await login(email, '203.0.113.10', 'wrong-password');
      expect(res.status).toBe(401);
    }

    // Same IP is now locked (pair + IP budget).
    const fromA = await login(email, '203.0.113.10');
    expect(fromA.status).toBe(401);

    // A different source IP is still allowed (user budget is 5 < 20).
    const fromB = await login(email, '203.0.113.11');
    expect(fromB.status).toBe(200);
  });

  it('the per-IP layer blocks a different account from the same host', async () => {
    const first = `ip-layer-${emailSeq}-a@example.com`;
    const second = `ip-layer-${emailSeq}-b@example.com`;
    await register(first, '203.0.113.20');
    await register(second, '203.0.113.20');

    for (let i = 0; i < 5; i += 1) {
      await login(first, '203.0.113.20', 'wrong-password');
    }

    const other = await login(second, '203.0.113.20');
    expect(other.status).toBe(401);
  });

  it('20 failures across 20 IPs lock the account globally (bounded, not permanent)', async () => {
    const email = `distributed-${emailSeq}@example.com`;
    await register(email, '198.51.100.1');

    for (let i = 0; i < 20; i += 1) {
      const ip = `198.51.100.${String(i + 2)}`;
      const res = await login(email, ip, 'wrong-password');
      expect(res.status).toBe(401);
    }

    const next = await login(email, '198.51.100.99');
    expect(next.status).toBe(401);
  });

  it('only the rightmost X-Forwarded-For entry is trusted (no left-padding bypass)', async () => {
    const email = `spoof-${emailSeq}@example.com`;
    await register(email, '192.0.2.10');

    for (let i = 0; i < 5; i += 1) {
      await login(email, `9.9.9.${String(i + 1)}, 192.0.2.10`, 'wrong-password');
    }

    // Different forged left-hand value, same trusted rightmost address.
    const spoofed = await login(email, '8.8.8.8, 192.0.2.10');
    expect(spoofed.status).toBe(401);
  });
});
