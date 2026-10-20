/**
 * S3-compatible avatar storage adapter (WP-01).
 *
 * - PUBLIC reads: objects are intended to be readable without
 *   authentication. The bucket (or CDN in front of it) MUST grant public
 *   read on `avatars/*`; this adapter never sets per-object ACLs so the
 *   bucket policy stays the single source of truth.
 * - Server-only writes: `putBuffer` uses the server's credentials.
 *   There is deliberately NO presigned client-upload URL — avatar bytes
 *   always pass through the API's validation + re-encode pipeline.
 * - Retrieval is a STABLE public URL (`{AVATAR_PUBLIC_BASE_URL}/{key}`),
 *   never a signed expiring URL.
 * - Fail-closed: missing credentials/bucket/public-base surface as a 500
 *   ApiException on FIRST USE (never at module boot, so unrelated routes
 *   keep working without avatar configuration).
 */

import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { ERROR_CODE } from '@khabir/shared-types';
import { Injectable } from '@nestjs/common';

import { ApiException } from '../common/errors';

import { isAllowedAvatarMime } from './avatar-validation';
import { readAvatarStorageConfig, REQUIRED_AVATAR_S3_ENV_VARS, type AvatarStorageConfig } from './avatar.config';

import type { AvatarStorageHeadResult, AvatarStoragePort } from './avatar-storage.port';

@Injectable()
export class S3AvatarStorageAdapter implements AvatarStoragePort {
  readonly provider = 's3' as const;

  private readonly config: AvatarStorageConfig;
  private client: S3Client | null = null;

  constructor() {
    this.config = readAvatarStorageConfig();
  }

  private getBucket(): string {
    if (this.config.bucket === null) {
      throw this.misconfigured('AVATAR_S3_BUCKET');
    }
    return this.config.bucket;
  }

  private getPublicBase(): string {
    if (this.config.publicBaseUrl === null) {
      throw this.misconfigured('AVATAR_PUBLIC_BASE_URL');
    }
    return this.config.publicBaseUrl.endsWith('/')
      ? this.config.publicBaseUrl.slice(0, -1)
      : this.config.publicBaseUrl;
  }

  private misconfigured(missingVar: string): ApiException {
    return new ApiException(
      ERROR_CODE.INTERNAL_ERROR,
      `Avatar storage is not configured (missing ${missingVar}). Inject S3 credentials to enable profile photo uploads.`,
      500,
    );
  }

  private getClient(): S3Client {
    if (this.client !== null) {
      return this.client;
    }
    const missing = REQUIRED_AVATAR_S3_ENV_VARS.find(
      (name) =>
        name === 'AVATAR_S3_BUCKET'
          ? this.config.bucket === null
          : name === 'AVATAR_S3_ACCESS_KEY_ID'
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
        // Checked non-null above via REQUIRED_AVATAR_S3_ENV_VARS.
        accessKeyId: this.config.accessKeyId as string,
        secretAccessKey: this.config.secretAccessKey as string,
      },
    });
    return this.client;
  }

  async putBuffer(key: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    if (!isAllowedAvatarMime(mimeType)) {
      throw new Error(`putBuffer requires an allowlisted MIME type, got: ${mimeType}`);
    }
    const client = this.getClient();
    const bucket = this.getBucket();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength),
        ContentType: mimeType.toLowerCase(),
        // No ACL: the bucket policy owns public-read on avatars/*.
      }),
    );
  }

  getPublicUrl(key: string): string {
    return `${this.getPublicBase()}/${key}`;
  }

  async head(key: string): Promise<AvatarStorageHeadResult> {
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
