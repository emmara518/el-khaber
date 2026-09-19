/**
 * Proof-storage configuration (PHASE 20).
 *
 * Read locally from the process environment (server-only variables —
 * NEVER `EXPO_PUBLIC_*`). This module intentionally does NOT extend the
 * shared `AppConfig`: it keeps the proof lifecycle self-contained and
 * boots with safe dev defaults so unrelated suites keep working without
 * storage credentials. The S3 adapter fails closed on first USE (not at
 * startup) when credentials are missing, so the API still boots and every
 * non-proof route keeps working.
 *
 * Variables (documented in `apps/api/.env.example`):
 * - PROOF_STORAGE_PROVIDER      s3 | local (default: local)
 * - PROOF_S3_BUCKET             S3 bucket name (required for provider=s3)
 * - PROOF_S3_REGION             S3 region (default: us-east-1)
 * - PROOF_S3_ENDPOINT           Custom S3-compatible endpoint (optional)
 * - PROOF_S3_ACCESS_KEY_ID      Server-only access key (required for s3)
 * - PROOF_S3_SECRET_ACCESS_KEY  Server-only secret (required for s3)
 * - PROOF_URL_TTL_SECONDS       Presigned URL lifetime (default: 300)
 * - PROOF_MAX_BYTES             Max proof size in bytes (default: 5242880 = 5MB)
 * - PROOF_LOCAL_DIR             Local adapter directory (default: .proof-storage)
 */

import type { StorageProvider } from './storage.port';

export const DEFAULT_PROOF_URL_TTL_SECONDS = 300;
export const DEFAULT_PROOF_MAX_BYTES = 5 * 1024 * 1024;

export interface ProofStorageConfig {
  readonly provider: StorageProvider;
  readonly bucket: string | null;
  readonly region: string;
  readonly endpoint: string | null;
  readonly accessKeyId: string | null;
  readonly secretAccessKey: string | null;
  readonly urlTtlSeconds: number;
  readonly maxBytes: number;
  readonly localDir: string;
}

function readString(env: NodeJS.ProcessEnv, name: string): string | null {
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    return null;
  }
  return value.trim();
}

function readNumber(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n <= 0) {
    throw new Error(`Invalid number for ${name}: ${raw}`);
  }
  return n;
}

export function readProofStorageConfig(env: NodeJS.ProcessEnv = process.env): ProofStorageConfig {
  const rawProvider = (readString(env, 'PROOF_STORAGE_PROVIDER') ?? 'local').toLowerCase();
  if (rawProvider !== 's3' && rawProvider !== 'local') {
    throw new Error(`Invalid PROOF_STORAGE_PROVIDER: ${rawProvider} (expected s3|local)`);
  }
  return {
    provider: rawProvider,
    bucket: readString(env, 'PROOF_S3_BUCKET'),
    region: readString(env, 'PROOF_S3_REGION') ?? 'us-east-1',
    endpoint: readString(env, 'PROOF_S3_ENDPOINT'),
    accessKeyId: readString(env, 'PROOF_S3_ACCESS_KEY_ID'),
    secretAccessKey: readString(env, 'PROOF_S3_SECRET_ACCESS_KEY'),
    urlTtlSeconds: readNumber(env, 'PROOF_URL_TTL_SECONDS', DEFAULT_PROOF_URL_TTL_SECONDS),
    maxBytes: readNumber(env, 'PROOF_MAX_BYTES', DEFAULT_PROOF_MAX_BYTES),
    localDir: readString(env, 'PROOF_LOCAL_DIR') ?? '.proof-storage',
  };
}

/**
 * Names of the server-only variables that MUST be injected for the S3
 * provider to operate. Missing values are reported verbatim by the S3
 * adapter on first use (fail-closed, never faked).
 */
export const REQUIRED_S3_ENV_VARS = [
  'PROOF_S3_BUCKET',
  'PROOF_S3_ACCESS_KEY_ID',
  'PROOF_S3_SECRET_ACCESS_KEY',
] as const;
