/**
 * Payment-proof storage port (PHASE 20).
 *
 * Provider-abstracted lifecycle for manual-payment proof images. The
 * production provider is any S3-compatible object store reached through
 * presigned URLs; a local-filesystem adapter exists for development and
 * tests. Supabase Storage is explicitly OUT OF SCOPE per
 * docs/adr/0004-supabase-postgres.md and MUST NOT be used here.
 *
 * Security properties (enforced by callers in `subscriptions/`):
 * - Objects are PRIVATE by default (no public ACL, no public URLs).
 * - Uploads use presigned PUT URLs bound to a server-generated storage key.
 * - Retrieval uses short-lived presigned GET URLs (admin review only).
 * - Arbitrary client-supplied URLs are NEVER trusted as storage references.
 */

export interface StorageHeadResult {
  exists: boolean;
  sizeBytes: number | null;
  mimeType: string | null;
}

export interface PresignedPutResult {
  /** URL the owner uploads the file bytes to (HTTP PUT). */
  url: string;
  /** Storage key the upload MUST be written to. */
  key: string;
  /** Seconds until the URL expires. */
  expiresInSeconds: number;
  /** Headers the client MUST send with the PUT (e.g. Content-Type). */
  requiredHeaders: Record<string, string>;
  /** Maximum accepted object size in bytes (enforced on confirm). */
  maxBytes: number;
}

export interface PresignedGetResult {
  /** Short-lived URL the bytes can be downloaded from (HTTP GET). */
  url: string;
  /** Storage key the URL was issued for. */
  key: string;
  /** Seconds until the URL expires. */
  expiresInSeconds: number;
}

export type StorageProvider = 's3' | 'local';

/**
 * Minimal object-storage port. Implementations MUST keep objects private
 * and MUST fail closed (throw) when misconfigured instead of silently
 * succeeding.
 */
export interface StoragePort {
  readonly provider: StorageProvider;

  /** Presigned PUT for a server-generated key + allowlisted MIME type. */
  presignPut(key: string, mimeType: string): Promise<PresignedPutResult>;

  /** Short-lived presigned GET for an existing key. */
  presignGet(key: string): Promise<PresignedGetResult>;

  /** Object existence + size/MIME metadata (no body download). */
  head(key: string): Promise<StorageHeadResult>;

  /**
   * First bytes of an object (for magic-byte verification on confirm).
   * Returns null when the object does not exist.
   */
  readPrefix(key: string, maxBytes: number): Promise<Uint8Array | null>;

  /** Best-effort delete; resolves when the key is absent afterwards. */
  delete(key: string): Promise<void>;
}

/** DI token for the StoragePort. */
export const STORAGE_PORT = 'PROOF_STORAGE_PORT';
