import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE_ENV = {
  PORT: '3000',
  API_GLOBAL_PREFIX: 'api/v1',
  CORS_ORIGINS: '',
  DATABASE_URL: 'postgresql://test/test',
  DIRECT_URL: 'postgresql://test/test',
  JWT_ACCESS_SECRET: 'valid-user-secret-valid-user-secret-32',
  ADMIN_JWT_ACCESS_SECRET: 'valid-admin-secret-valid-admin-secret-32',
  JWT_ISSUER: 'khabir-api',
  JWT_AUDIENCE: 'khabir',
  ADMIN_JWT_ISSUER: 'khabir-admin-api',
  ADMIN_JWT_AUDIENCE: 'khabir-admin',
} as const;

beforeEach(() => {
  vi.resetModules();
  process.env['NODE_ENV'] = 'test';
  for (const [key, value] of Object.entries(BASE_ENV)) {
    process.env[key] = value;
  }
});

afterEach(() => {
  vi.resetModules();
});

describe('runtime configuration validation', () => {
  it('rejects an unknown NODE_ENV instead of silently disabling production behavior', async () => {
    process.env['NODE_ENV'] = 'prod';
    const { getConfig } = await import('../src/config/app.config');
    expect(() => getConfig()).toThrow(/Invalid NODE_ENV/i);
  });

  it('rejects template placeholder secrets in production', async () => {
    process.env['NODE_ENV'] = 'production';
    process.env['JWT_ACCESS_SECRET'] = 'replace-me-with-a-strong-secret-at-least-32-bytes';
    const { getConfig } = await import('../src/config/app.config');
    expect(() => getConfig()).toThrow(/template placeholder/i);
  });

  it('accepts a valid production environment', async () => {
    process.env['NODE_ENV'] = 'production';
    const { getConfig } = await import('../src/config/app.config');
    expect(getConfig().env).toBe('production');
    expect(getConfig().trustProxyHops).toBe(1);
  });
});
