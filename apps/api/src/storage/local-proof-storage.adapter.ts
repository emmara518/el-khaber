/**
 * Local-filesystem proof storage adapter (PHASE 20).
 *
 * Development/test double for the StoragePort. Files live under
 * PROOF_LOCAL_DIR (default `<cwd>/.proof-storage`, git-ignored dev data —
 * NEVER production storage).
 *
 * Honesty contract: `head`, `readPrefix`, `delete`, and `putBuffer` operate
 * on real files. `presignPut`/`presignGet` return NON-ROUTABLE `local://`
 * placeholder URLs (there is no HTTP upload receiver in local mode) — they
 * exist so the key lifecycle can be exercised in dev/tests without
 * credentials. The production upload/download path is the S3 adapter with
 * real presigned URLs. Clients MUST NOT treat `local://` URLs as
 * downloadable content.
 */

import { promises as fs } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

import { Injectable } from '@nestjs/common';

import { isAllowedProofMime } from './proof-validation';
import { readProofStorageConfig, type ProofStorageConfig } from './proof.config';

import type { PresignedGetResult, PresignedPutResult, StorageHeadResult, StoragePort } from './storage.port';

@Injectable()
export class LocalProofStorageAdapter implements StoragePort {
  readonly provider = 'local' as const;

  private readonly config: ProofStorageConfig;
  private readonly root: string;

  constructor() {
    this.config = readProofStorageConfig();
    this.root = resolve(process.cwd(), this.config.localDir);
  }

  /** Direct write for dev scripts/tests (no HTTP upload in local mode). */
  async putBuffer(key: string, bytes: Uint8Array, _mimeType: string): Promise<void> {
    const path = this.resolvePath(key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, bytes);
  }

  async presignPut(key: string, mimeType: string): Promise<PresignedPutResult> {
    if (!isAllowedProofMime(mimeType)) {
      throw new Error(`presignPut requires an allowlisted MIME type, got: ${mimeType}`);
    }
    return {
      url: `local://${key}?expires_in=${this.config.urlTtlSeconds}`,
      key,
      expiresInSeconds: this.config.urlTtlSeconds,
      requiredHeaders: { 'Content-Type': mimeType.toLowerCase() },
      maxBytes: this.config.maxBytes,
    };
  }

  async presignGet(key: string): Promise<PresignedGetResult> {
    return {
      url: `local://${key}?expires_in=${this.config.urlTtlSeconds}`,
      key,
      expiresInSeconds: this.config.urlTtlSeconds,
    };
  }

  async head(key: string): Promise<StorageHeadResult> {
    try {
      const stat = await fs.stat(this.resolvePath(key));
      return { exists: true, sizeBytes: stat.size, mimeType: null };
    } catch {
      return { exists: false, sizeBytes: null, mimeType: null };
    }
  }

  async readPrefix(key: string, maxBytes: number): Promise<Uint8Array | null> {
    try {
      const handle = await fs.open(this.resolvePath(key), 'r');
      try {
        const capped = Math.max(1, Math.min(maxBytes, 64 * 1024));
        const buffer = Buffer.alloc(capped);
        const { bytesRead } = await handle.read(buffer, 0, capped, 0);
        return new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead);
      } finally {
        await handle.close();
      }
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolvePath(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /** Resolves a storage key inside the root; throws on traversal escape. */
  private resolvePath(key: string): string {
    const candidate = resolve(this.root, ...key.split('/'));
    const rel = relative(this.root, candidate);
    if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`)) {
      throw new Error(`Storage key escapes the local root: ${key}`);
    }
    return candidate;
  }
}
