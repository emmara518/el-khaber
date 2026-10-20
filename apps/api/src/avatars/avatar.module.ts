/**
 * Avatar domain module (WP-01).
 *
 * Owner-scoped profile images for customer/technician/merchant:
 * multipart upload + idempotent delete over the INDEPENDENT
 * `AVATAR_STORAGE_PORT` (public reads, server-only writes — D1).
 */

import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AvatarStorageModule } from '../storage/avatar-storage.module';

import { AvatarFileController } from './avatar-file.controller';
import { AvatarService } from './avatar.service';
import { MeAvatarController } from './me-avatar.controller';
import { MerchantAvatarController } from './merchant-avatar.controller';
import { TechnicianAvatarController } from './technician-avatar.controller';

@Module({
  // AuthModule provides JwtModule (for JwtAuthGuard) and exports the
  // shared-store RateLimitService (for the `avatar` upload policy).
  // AuditModule provides AuditService (avatar upload/delete audit trail).
  // AvatarStorageModule provides AVATAR_STORAGE_PORT (separate
  // bucket/namespace from proofs).
  imports: [AuthModule, AuditModule, AvatarStorageModule],
  controllers: [
    MeAvatarController,
    TechnicianAvatarController,
    MerchantAvatarController,
    AvatarFileController,
  ],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule {}
