/**
 * Local-filesystem avatar storage adapter (WP-01).
 *
 * Development/test double for the AvatarStoragePort. Files live under
 * AVATAR_LOCAL_DIR (default `<cwd>/.avatar-storage`, git-ignored dev
 * data — NEVER production storage).
 *
 * Honesty contract:
 * - `putBuffer`, `head`, and `delete` operate on real files.
 * - `getPublicUrl` returns an `http(s)://` URL served by the DEV-ONLY
 *   `GET /avatars-file/*` route (registered by the avatar module outside
 *   production). There is no `local://` placeholder: anything persisted
 *   as a profile image MUST be downloadable by the client, even in dev.
 */

import { promises as fs } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

import { Injectable } from '@nestjs/common';

import { isAllowedAvatarMime } from './avatar-validation';
import {
  DEFAULT_AVATAR_LOCAL_PUBLIC_BASE,
  readAvatarStorageConfig,
  type AvatarStorageConfig,
} from './avatar.config';

import type { AvatarStorageHeadResult, AvatarStoragePort } from './avatar-storage.port';

@Injectable()
export class LocalAvatarStorageAdapter implements AvatarStoragePort {
  readonly provider = 'local' as const;

  private readonly config: AvatarStorageConfig;
  private readonly root: string;

  constructor() {
    this.config = readAvatarStorageConfig();
    this.root = resolve(process.cwd(), this.config.localDir);
  }

  /** Direct server-side write (no HTTP upload in local mode either). */
  async putBuffer(key: string, bytes: Uint8Array, mimeType: string): Promise<void> {
    if (!isAllowedAvatarMime(mimeType)) {
      throw new Error(`putBuffer requires an allowlisted MIME type, got: ${mimeType}`);
    }
    const path = this.resolvePath(key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, bytes);
  }

  getPublicUrl(key: string): string {
    const base =
      this.config.publicBaseUrl ?? DEFAULT_AVATAR_LOCAL_PUBLIC_BASE;
    const trimmed = base.endsWith('/') ? base.slice(0, -1) : base;
    return `${trimmed}/${key}`;
  }

  async head(key: string): Promise<AvatarStorageHeadResult> {
    try {
      const stat = await fs.stat(this.resolvePath(key));
      return { exists: true, sizeBytes: stat.size, mimeType: null };
    } catch {
      return { exists: false, sizeBytes: null, mimeType: null };
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

  /** Absolute path for the dev-only file-serving route (same traversal guard). */
  resolveAbsolutePath(key: string): string {
    return this.resolvePath(key);
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
