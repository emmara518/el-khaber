/**
 * Avatar-storage configuration (WP-01).
 *
 * Read locally from the process environment (server-only variables —
 * NEVER `EXPO_PUBLIC_*`). This module intentionally does NOT extend the
 * shared `AppConfig` and does NOT share variables with the proof
 * lifecycle: avatars live in their own bucket under their own policy
 * (public reads, server-only writes) while proofs stay private (D1).
 *
 * Variables (documented in `apps/api/.env.example`):
 * - AVATAR_STORAGE_PROVIDER     s3 | local (default: local)
 * - AVATAR_S3_BUCKET            S3 bucket name (required for provider=s3;
 *                               must be a PUBLIC-READ bucket for `avatars/*`)
 * - AVATAR_S3_REGION            S3 region (default: us-east-1)
 * - AVATAR_S3_ENDPOINT          Custom S3-compatible endpoint (optional)
 * - AVATAR_S3_ACCESS_KEY_ID     Server-only access key (required for s3)
 * - AVATAR_S3_SECRET_ACCESS_KEY Server-only secret (required for s3)
 * - AVATAR_PUBLIC_BASE_URL      Public base URL for avatar reads
 *                               (e.g. https://cdn.example.com or the
 *                               bucket website endpoint). Required for
 *                               provider=s3; dev-only default for local.
 * - AVATAR_MAX_BYTES            Max upload size in bytes
 *                               (default: 2097152 = 2MB)
 * - AVATAR_LOCAL_DIR            Local adapter directory
 *                               (default: .avatar-storage)
 *
 * Fail-closed rules:
 * - `local` is refused in production (same rationale as proofs).
 * - `s3` without a bucket/credentials fails on first USE (never at
 *   module boot, so unrelated routes keep working without credentials).
 * - Production without `AVATAR_PUBLIC_BASE_URL` fails on first USE:
 *   the API must never persist a `local://` placeholder as a profile
 *   image (clients cannot download it).
 */

import type { AvatarStorageProvider } from './avatar-storage.port';

export const DEFAULT_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const DEFAULT_AVATAR_LOCAL_DIR = '.avatar-storage';
export const DEFAULT_AVATAR_LOCAL_PUBLIC_BASE = 'http://localhost:3000/api/v1/avatars-file';

export interface AvatarStorageConfig {
  readonly provider: AvatarStorageProvider;
  readonly bucket: string | null;
  readonly region: string;
  readonly endpoint: string | null;
  readonly accessKeyId: string | null;
  readonly secretAccessKey: string | null;
  readonly publicBaseUrl: string | null;
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

export function readAvatarStorageConfig(env: NodeJS.ProcessEnv = process.env): AvatarStorageConfig {
  const rawProvider = (readString(env, 'AVATAR_STORAGE_PROVIDER') ?? 'local').toLowerCase();
  if (rawProvider !== 's3' && rawProvider !== 'local') {
    throw new Error(`Invalid AVATAR_STORAGE_PROVIDER: ${rawProvider} (expected s3|local)`);
  }
  // The local adapter writes to disk and serves files through a DEV-ONLY
  // route — acceptable for development/tests only. Refuse it in
  // production so a misconfigured deploy fails fast instead of serving
  // avatars from an ephemeral container disk.
  const nodeEnv = (readString(env, 'NODE_ENV') ?? 'development').toLowerCase();
  if (nodeEnv === 'production' && rawProvider === 'local') {
    throw new Error(
      'AVATAR_STORAGE_PROVIDER=local is not allowed in production; set provider=s3 with AVATAR_S3_BUCKET/AVATAR_S3_ACCESS_KEY_ID/AVATAR_S3_SECRET_ACCESS_KEY and AVATAR_PUBLIC_BASE_URL',
    );
  }
  return {
    provider: rawProvider,
    bucket: readString(env, 'AVATAR_S3_BUCKET'),
    region: readString(env, 'AVATAR_S3_REGION') ?? 'us-east-1',
    endpoint: readString(env, 'AVATAR_S3_ENDPOINT'),
    accessKeyId: readString(env, 'AVATAR_S3_ACCESS_KEY_ID'),
    secretAccessKey: readString(env, 'AVATAR_S3_SECRET_ACCESS_KEY'),
    publicBaseUrl: readString(env, 'AVATAR_PUBLIC_BASE_URL'),
    maxBytes: readNumber(env, 'AVATAR_MAX_BYTES', DEFAULT_AVATAR_MAX_BYTES),
    localDir: readString(env, 'AVATAR_LOCAL_DIR') ?? DEFAULT_AVATAR_LOCAL_DIR,
  };
}

/**
 * Names of the server-only variables that MUST be injected for the S3
 * provider to operate. Missing values are reported verbatim by the S3
 * adapter on first use (fail-closed, never faked).
 */
export const REQUIRED_AVATAR_S3_ENV_VARS = [
  'AVATAR_S3_BUCKET',
  'AVATAR_S3_ACCESS_KEY_ID',
  'AVATAR_S3_SECRET_ACCESS_KEY',
] as const;
