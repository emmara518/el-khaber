/**
 * S3-compatible proof storage adapter (PHASE 20).
 *
 * - Private objects only: presigned PUTs carry no ACL (bucket default =
 *   private) and retrieval is via short-lived presigned GETs. No public
 *   URLs are ever issued.
 * - Upload flow: `presignPut` signs a PutObject with the allowlisted
 *   Content-Type bound into the signature, so the stored object keeps the
 *   declared MIME for the confirm-time HEAD check.
 * - Confirm flow: `head` uses HeadObject (existence + ContentLength +
 *   ContentType); `readPrefix` uses a ranged GetObject (bytes=0-N) for
 *   magic-byte verification without downloading the whole object.
 * - Custom S3-compatible endpoints (MinIO / R2 / Spaces) are supported via
 *   PROOF_S3_ENDPOINT with path-style addressing forced in that case.
 * - Fail-closed: when any required credential is missing the adapter throws
 *   a 500 ApiException naming the exact env var on FIRST USE (never at
 *   module boot, so unrelated routes keep working without credentials).
 */

import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ERROR_CODE } from '@khabir/shared-types';
import { Injectable } from '@nestjs/common';

import { ApiException } from '../common/errors';

import { isAllowedProofMime } from './proof-validation';
import { readProofStorageConfig, REQUIRED_S3_ENV_VARS, type ProofStorageConfig } from './proof.config';

import type { PresignedGetResult, PresignedPutResult, StorageHeadResult, StoragePort } from './storage.port';


@Injectable()
export class S3ProofStorageAdapter implements StoragePort {
  readonly provider = 's3' as const;

  private readonly config: ProofStorageConfig;
  private client: S3Client | null = null;

  constructor() {
    this.config = readProofStorageConfig();
  }

  private getBucket(): string {
    if (this.config.bucket === null) {
      throw this.misconfigured('PROOF_S3_BUCKET');
    }
    return this.config.bucket;
  }

  private misconfigured(missingVar: string): ApiException {
    return new ApiException(
      ERROR_CODE.INTERNAL_ERROR,
      `Proof storage is not configured (missing ${missingVar}). Inject S3 credentials to enable payment proof uploads.`,
      500,
    );
  }

  private getClient(): S3Client {
    if (this.client !== null) {
      return this.client;
    }
    const missing = REQUIRED_S3_ENV_VARS.find(
      (name) =>
        name === 'PROOF_S3_BUCKET'
        ? this.config.bucket === null
        : name === 'PROOF_S3_ACCESS_KEY_ID'
          ? this.config.accessKeyId === null
          : this.config.secretAccessKey === null,
    );
    if (missing !== undefined) {
      throw this.misconfigured(missing);
    }
    this.client = new S3Client({
      region: this.config.region,
      ...(this.config.endpoint !== null
        ? { endpoint: this.config.endpoint, forcePathStyle: true }
        : {}),
      credentials: {
        // Checked non-null above via REQUIRED_S3_ENV_VARS.
        accessKeyId: this.config.accessKeyId as string,
        secretAccessKey: this.config.secretAccessKey as string,
      },
    });
    return this.client;
  }

  async presignPut(key: string, mimeType: string): Promise<PresignedPutResult> {
    if (!isAllowedProofMime(mimeType)) {
      throw new Error(`presignPut requires an allowlisted MIME type, got: ${mimeType}`);
    }
    const client = this.getClient();
    const bucket = this.getBucket();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType.toLowerCase(),
    });
    const url = await getSignedUrl(client, command, { expiresIn: this.config.urlTtlSeconds });
    return {
      url,
      key,
      expiresInSeconds: this.config.urlTtlSeconds,
      requiredHeaders: { 'Content-Type': mimeType.toLowerCase() },
      maxBytes: this.config.maxBytes,
    };
  }

  async presignGet(key: string): Promise<PresignedGetResult> {
    const client = this.getClient();
    const bucket = this.getBucket();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(client, command, { expiresIn: this.config.urlTtlSeconds });
    return { url, key, expiresInSeconds: this.config.urlTtlSeconds };
  }

  async head(key: string): Promise<StorageHeadResult> {
    const client = this.getClient();
    const bucket = this.getBucket();
    try {
      const out = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return {
        exists: true,
        sizeBytes: typeof out.ContentLength === 'number' ? out.ContentLength : null,
        mimeType: typeof out.ContentType === 'string' ? out.ContentType : null,
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        return { exists: false, sizeBytes: null, mimeType: null };
      }
      throw error;
    }
  }

  async readPrefix(key: string, maxBytes: number): Promise<Uint8Array | null> {
    const client = this.getClient();
    const bucket = this.getBucket();
    const capped = Math.max(1, Math.min(maxBytes, 64 * 1024));
    try {
      const out = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key, Range: `bytes=0-${capped - 1}` }),
      );
      const body = out.Body;
      if (body === undefined) {
        return null;
      }
      return await streamToBytes(body as AsyncIterable<Uint8Array>, capped);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const client = this.getClient();
    const bucket = this.getBucket();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const name = (error as { name?: unknown }).name;
  const status = (error as { $metadata?: { httpStatusCode?: unknown } }).$metadata?.httpStatusCode;
  return name === 'NotFound' || name === 'NoSuchKey' || status === 404;
}

async function streamToBytes(stream: AsyncIterable<Uint8Array>, limit: number): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of stream) {
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk as ArrayBuffer);
    chunks.push(bytes);
    total += bytes.byteLength;
    if (total >= limit) {
      break;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.subarray(0, Math.min(out.byteLength, limit));
}
