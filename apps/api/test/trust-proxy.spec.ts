import { ExpressAdapter } from '@nestjs/platform-express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * AUD-007 (S-2): trust-proxy wiring tests.
 *
 * 1. Config: TRUST_PROXY_HOPS defaults (1 in production, 0 otherwise) are
 *    correct and a malformed value is fatal (fail-closed).
 * 2. Express numeric semantics, exercised through the same NestExpress
 *    runtime the API uses (ExpressAdapter -> bare express instance):
 *      - hops = 0: direct traffic, the header must be IGNORED entirely.
 *      - hops = 1: req.ip = the RIGHTMOST X-Forwarded-For entry, i.e. the
 *        value the (single) trusted proxy appended — attacker-supplied
 *        entries further left must NOT win (RealRender appends the real
 *        client IP, so spoofing cannot move the resolved address).
 *      - hops too large (e.g. 2 when only 1 trusted proxy exists):
 *        documented behavior — the resolved client becomes attacker-
 *        controllable. This case exists as a regression contract that the
 *        hop count must match the actual topology.
 */

const REQUIRED_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test/test',
  DIRECT_URL: 'postgresql://test/test',
  JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret-32',
  ADMIN_JWT_ACCESS_SECRET: 'test-admin-secret-test-admin-secret-32',
};

async function loadConfig(overrides: Record<string, string | undefined>) {
  vi.resetModules();
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(REQUIRED_ENV)) {
    saved[key] = process.env[key];
    process.env[key] = REQUIRED_ENV[key];
  }
  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    const mod = await import('../src/config/app.config');
    return { config: mod.getConfig() };
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

describe('trust proxy configuration (AUD-007)', () => {
  it('defaults to 1 trusted hop in production (single Render proxy)', async () => {
    const { config } = await loadConfig({ NODE_ENV: 'production', TRUST_PROXY_HOPS: undefined });
    expect(config.trustProxyHops).toBe(1);
  });

  it('defaults to 0 trusted hops outside production (direct traffic)', async () => {
    const { config } = await loadConfig({ NODE_ENV: 'development', TRUST_PROXY_HOPS: undefined });
    expect(config.trustProxyHops).toBe(0);
    const dev = await loadConfig({ NODE_ENV: undefined, TRUST_PROXY_HOPS: undefined });
    expect(dev.config.trustProxyHops).toBe(0);
  });

  it('honors an explicit non-negative integer hop count', async () => {
    const { config } = await loadConfig({ TRUST_PROXY_HOPS: '2' });
    expect(config.trustProxyHops).toBe(2);
    const zero = await loadConfig({ TRUST_PROXY_HOPS: '0' });
    expect(zero.config.trustProxyHops).toBe(0);
  });

  it('fails closed on malformed hop values', async () => {
    await expect(loadConfig({ TRUST_PROXY_HOPS: 'abc' })).rejects.toThrow(/Invalid number for TRUST_PROXY_HOPS/);
    await expect(loadConfig({ TRUST_PROXY_HOPS: '-1' })).rejects.toThrow(/Invalid number for TRUST_PROXY_HOPS/);
    await expect(loadConfig({ TRUST_PROXY_HOPS: '1.5' })).rejects.toThrow(/Invalid number for TRUST_PROXY_HOPS/);
  });
});

describe('express numeric trust proxy semantics (AUD-007)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function makeProbeServer(hops: number) {
    // Same express runtime as the API (via @nestjs/platform-express), with
    // exactly the wiring main.ts applies: app.set('trust proxy', hops).
    const adapter = new ExpressAdapter();
    const server = adapter.getInstance();
    server.set('trust proxy', hops);
    server.get('/__ip-probe', (req: { ip?: string }, res: { json: (body: unknown) => void }) => {
      res.json({ ip: req.ip });
    });
    return server;
  }

  it('hops=0 ignores a client-forged X-Forwarded-For entirely (direct deployment)', async () => {
    const server = makeProbeServer(0);
    const res = await request(server)
      .get('/__ip-probe')
      .set('X-Forwarded-For', '203.0.113.7')
      .expect(200);
    // req.ip = the actual TCP peer (loopback in supertest) — not the header.
    expect(String(res.body.ip)).toContain('127.0.0.1');
  });

  it('hops=1 resolves the proxy-appended client and blocks left-padded spoofing', async () => {
    const server = makeProbeServer(1);
    // Header as Render would deliver it: attacker-supplied entries first,
    // Render-appended observation LAST (rightmost).
    const padded = await request(server)
      .get('/__ip-probe')
      .set('X-Forwarded-For', '9.9.9.9, 6.6.6.6, 203.0.113.7')
      .expect(200);
    expect(padded.body.ip).toBe('203.0.113.7');
    // Plain single-hop header.
    const single = await request(server)
      .get('/__ip-probe')
      .set('X-Forwarded-For', '198.51.100.23')
      .expect(200);
    expect(single.body.ip).toBe('198.51.100.23');
  });

  it('hops=1 without the header falls back to the direct peer', async () => {
    const server = makeProbeServer(1);
    const res = await request(server).get('/__ip-probe').expect(200);
    expect(String(res.body.ip)).toContain('127.0.0.1');
  });

  it('REGRESSION CONTRACT: over-trusting (hops=2 for a 1-hop topology) lets attacker entries win', async () => {
    const server = makeProbeServer(2);
    const res = await request(server)
      .get('/__ip-probe')
      .set('X-Forwarded-For', '6.6.6.6, 203.0.113.7')
      .expect(200);
    // Documented danger — proves the hop count MUST match the real proxy
    // topology, otherwise the resolved client is attacker-controlled.
    expect(res.body.ip).toBe('6.6.6.6');
  });
});
