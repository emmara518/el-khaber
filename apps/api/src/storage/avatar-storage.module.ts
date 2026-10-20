/**
 * Avatar storage module (WP-01).
 *
 * Registers the AVATAR_STORAGE_PORT provider selected by
 * AVATAR_STORAGE_PROVIDER (s3 | local, default local). The selection is
 * lazy and fail-closed: missing S3 credentials surface on first avatar
 * USE, never at boot, so the API starts and all unrelated routes keep
 * working without them.
 *
 * This module is independent from the proof StorageModule (D1): separate
 * DI token, separate bucket, separate key namespace, separate policy.
 */

import { Global, Module, type Type } from '@nestjs/common';

import { AVATAR_STORAGE_PORT } from './avatar-storage.port';
import { readAvatarStorageConfig } from './avatar.config';
import { LocalAvatarStorageAdapter } from './local-avatar.adapter';
import { S3AvatarStorageAdapter } from './s3-avatar.adapter';

function buildAvatarStorageProvider(): { provide: string; useClass: Type<unknown> } {
  const { provider } = readAvatarStorageConfig();
  return {
    provide: AVATAR_STORAGE_PORT,
    useClass: provider === 's3' ? S3AvatarStorageAdapter : LocalAvatarStorageAdapter,
  };
}

@Global()
@Module({
  providers: [buildAvatarStorageProvider(), S3AvatarStorageAdapter, LocalAvatarStorageAdapter],
  // The port is the primary injection point. The concrete adapters are
  // exported as well so the DEV-ONLY file-serving route can resolve
  // local paths without duplicating the traversal guard.
  exports: [AVATAR_STORAGE_PORT, S3AvatarStorageAdapter, LocalAvatarStorageAdapter],
})
export class AvatarStorageModule {}
