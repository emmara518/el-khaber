/**
 * Avatar storage port (WP-01).
 *
 * Provider-abstracted lifecycle for PUBLIC profile images (customer
 * avatar, technician avatar, merchant logo). This port is DELIBERATELY
 * independent from the payment-proof `STORAGE_PORT`:
 * - Proofs are PRIVATE (presigned PUT/GET, admin review only).
 * - Avatars are PUBLIC (stable public URLs served to every client,
 *   including unauthenticated discovery/detail reads).
 *
 * Sharing one port/bucket/policy between the two would leak either the
 * private discipline (proofs) or the public readability (avatars), so a
 * separate `AVATAR_STORAGE_PORT` with its own bucket, key namespace
 * (`avatars/`), and adapters is required (D1).
 *
 * Security properties (enforced by callers in `avatars/`):
 * - Uploads happen SERVER-SIDE only (multipart → validated → re-encoded
 *   → `putBuffer`). There is no client-upload URL to steal or replay.
 * - Storage keys are SERVER-GENERATED (`avatars/{userId}/{uuid}.{ext}`).
 *   Client-supplied URLs/keys are NEVER trusted as avatar references.
 * - Retrieval is a STABLE PUBLIC URL (no expiry). Write/delete remain
 *   server-only.
 * - Implementations MUST fail closed (throw) when misconfigured instead
 *   of silently succeeding.
 */

export interface AvatarStorageHeadResult {
  exists: boolean;
  sizeBytes: number | null;
  mimeType: string | null;
}

export type AvatarStorageProvider = 's3' | 'local';

/**
 * Minimal public-image storage port. Implementations MUST keep
 * write/delete server-only, MUST serve reads publicly, and MUST fail
 * closed when misconfigured.
 */
export interface AvatarStoragePort {
  readonly provider: AvatarStorageProvider;

  /**
   * Server-side write of fully-validated, re-encoded image bytes to a
   * server-generated key. Overwrites are allowed only for keys the
   * caller generated in this same operation (fresh UUID).
   */
  putBuffer(key: string, bytes: Uint8Array, mimeType: string): Promise<void>;

  /**
   * Stable public URL for an existing key. The URL MUST be readable
   * without authentication and MUST NOT contain credentials.
   */
  getPublicUrl(key: string): string;

  /** Object existence + size/MIME metadata (no body download). */
  head(key: string): Promise<AvatarStorageHeadResult>;

  /** Best-effort delete; resolves when the key is absent afterwards. */
  delete(key: string): Promise<void>;
}

/** DI token for the AvatarStoragePort. */
export const AVATAR_STORAGE_PORT = 'AVATAR_STORAGE_PORT';
