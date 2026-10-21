/**
 * Unit tests for avatar-storage configuration (WP-01).
 *
 * The avatar lifecycle keeps its own environment contract, separate
 * from proofs: own provider flag, own bucket/credentials, own public
 * base URL, own size default (2MB), own local directory. Production
 * refuses the local adapter (fail-fast, same rationale as proofs).
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_AVATAR_MAX_BYTES,
  readAvatarStorageConfig,
} from './avatar.config';

describe('readAvatarStorageConfig', () => {
  it('defaults to the local provider with a 2MB cap', () => {
    const config = readAvatarStorageConfig({ NODE_ENV: 'development' } as NodeJS.ProcessEnv);
    expect(config.provider).toBe('local');
    expect(config.maxBytes).toBe(DEFAULT_AVATAR_MAX_BYTES);
    expect(DEFAULT_AVATAR_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(config.localDir).toBe('.avatar-storage');
    expect(config.bucket).toBeNull();
  });

  it('reads s3 settings without sharing proof variable names', () => {
    const config = readAvatarStorageConfig({
      NODE_ENV: 'development',
      AVATAR_STORAGE_PROVIDER: 's3',
      AVATAR_S3_BUCKET: 'khabir-avatars-dev',
      AVATAR_S3_REGION: 'eu-west-1',
      AVATAR_S3_ACCESS_KEY_ID: 'key',
      AVATAR_S3_SECRET_ACCESS_KEY: 'secret',
      AVATAR_PUBLIC_BASE_URL: 'https://cdn.example.com',
      AVATAR_MAX_BYTES: '1048576',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.provider).toBe('s3');
    expect(config.bucket).toBe('khabir-avatars-dev');
    expect(config.region).toBe('eu-west-1');
    expect(config.publicBaseUrl).toBe('https://cdn.example.com');
    expect(config.maxBytes).toBe(1048576);
  });

  it('rejects unknown providers', () => {
    expect(() =>
      readAvatarStorageConfig({
        AVATAR_STORAGE_PROVIDER: 'supabase',
      } as NodeJS.ProcessEnv),
    ).toThrow(/Invalid AVATAR_STORAGE_PROVIDER/);
  });

  it('refuses the local adapter in production', () => {
    expect(() =>
      readAvatarStorageConfig({
        NODE_ENV: 'production',
        AVATAR_STORAGE_PROVIDER: 'local',
      } as NodeJS.ProcessEnv),
    ).toThrow(/not allowed in production/);
  });

  it('rejects non-positive size overrides', () => {
    expect(() =>
      readAvatarStorageConfig({ AVATAR_MAX_BYTES: '0' } as NodeJS.ProcessEnv),
    ).toThrow(/Invalid number for AVATAR_MAX_BYTES/);
  });
});
