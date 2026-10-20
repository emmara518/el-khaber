/**
 * Request-media configuration (Track B2).
 *
 * Customer-attached photos for a service request reuse the SAME
 * provider-abstracted StoragePort as payment proofs (PHASE 20): private
 * objects, presigned PUT/GET, server-generated keys. Only the media
 * policy (size + count) is specific to this domain, so this module keeps
 * those knobs self-contained with safe defaults.
 *
 * Variables (documented in `apps/api/.env.example`):
 * - REQUEST_MEDIA_MAX_BYTES         Max photo size in bytes (default: 5242880 = 5MB)
 * - REQUEST_MEDIA_MAX_PER_REQUEST   Max photos per request (default: 5)
 */

export const DEFAULT_REQUEST_MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const DEFAULT_REQUEST_MEDIA_MAX_PER_REQUEST = 5;

export interface RequestMediaConfig {
  readonly maxBytes: number;
  readonly maxPerRequest: number;
}

function readPositiveInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
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

export function readRequestMediaConfig(
  env: NodeJS.ProcessEnv = process.env,
): RequestMediaConfig {
  return {
    maxBytes: readPositiveInt(env, 'REQUEST_MEDIA_MAX_BYTES', DEFAULT_REQUEST_MEDIA_MAX_BYTES),
    maxPerRequest: readPositiveInt(
      env,
      'REQUEST_MEDIA_MAX_PER_REQUEST',
      DEFAULT_REQUEST_MEDIA_MAX_PER_REQUEST,
    ),
  };
}
