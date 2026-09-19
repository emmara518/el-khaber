/**
 * Unit tests for proof-storage config (PHASE 20). Reads process.env with
 * save/restore isolation — never touches real credentials.
 */

import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_PROOF_MAX_BYTES,
  DEFAULT_PROOF_URL_TTL_SECONDS,
  readProofStorageConfig,
} from './proof.config';

const KEYS = [
  'PROOF_STORAGE_PROVIDER',
  'PROOF_S3_BUCKET',
  'PROOF_S3_REGION',
  'PROOF_S3_ENDPOINT',
  'PROOF_S3_ACCESS_KEY_ID',
  'PROOF_S3_SECRET_ACCESS_KEY',
  'PROOF_URL_TTL_SECONDS',
  'PROOF_MAX_BYTES',
  'PROOF_LOCAL_DIR',
];

const saved = new Map<string, string | undefined>();

function snapshot(): void {
  saved.clear();
  for (const key of KEYS) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }
}

function restore(): void {
  for (const key of KEYS) {
    const value = saved.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

afterEach(() => {
  restore();
});

describe('readProofStorageConfig', () => {
  it('boots with safe dev defaults (no credentials required)', () => {
    snapshot();
    const config = readProofStorageConfig();
    expect(config.provider).toBe('local');
    expect(config.bucket).toBeNull();
    expect(config.accessKeyId).toBeNull();
    expect(config.secretAccessKey).toBeNull();
    expect(config.urlTtlSeconds).toBe(DEFAULT_PROOF_URL_TTL_SECONDS);
    expect(config.maxBytes).toBe(DEFAULT_PROOF_MAX_BYTES);
  });

  it('parses a full S3 configuration', () => {
    snapshot();
    process.env['PROOF_STORAGE_PROVIDER'] = 's3';
    process.env['PROOF_S3_BUCKET'] = 'khabir-proofs';
    process.env['PROOF_S3_REGION'] = 'eu-central-1';
    process.env['PROOF_S3_ENDPOINT'] = 'https://s3.example.com';
    process.env['PROOF_S3_ACCESS_KEY_ID'] = 'key-id';
    process.env['PROOF_S3_SECRET_ACCESS_KEY'] = 'secret';
    process.env['PROOF_URL_TTL_SECONDS'] = '120';
    process.env['PROOF_MAX_BYTES'] = '1048576';
    const config = readProofStorageConfig();
    expect(config.provider).toBe('s3');
    expect(config.bucket).toBe('khabir-proofs');
    expect(config.region).toBe('eu-central-1');
    expect(config.endpoint).toBe('https://s3.example.com');
    expect(config.accessKeyId).toBe('key-id');
    expect(config.secretAccessKey).toBe('secret');
    expect(config.urlTtlSeconds).toBe(120);
    expect(config.maxBytes).toBe(1048576);
  });

  it('rejects unknown providers and non-positive numbers', () => {
    snapshot();
    process.env['PROOF_STORAGE_PROVIDER'] = 'supabase';
    expect(() => readProofStorageConfig()).toThrow(/PROOF_STORAGE_PROVIDER/);
    delete process.env['PROOF_STORAGE_PROVIDER'];

    process.env['PROOF_MAX_BYTES'] = 'not-a-number';
    expect(() => readProofStorageConfig()).toThrow(/PROOF_MAX_BYTES/);
    delete process.env['PROOF_MAX_BYTES'];

    process.env['PROOF_URL_TTL_SECONDS'] = '0';
    expect(() => readProofStorageConfig()).toThrow(/PROOF_URL_TTL_SECONDS/);
  });
});
