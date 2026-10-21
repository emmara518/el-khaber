/**
 * Service Request lifecycle module (Task 10F, Track B2 media).
 */

import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

import { RequestMediaController } from './request-media.controller';
import { RequestMediaService } from './request-media.service';
import { ServiceRequestsController } from './service-requests.controller';
import { ServiceRequestsService } from './service-requests.service';

@Module({
  // AuthModule provides JwtModule for the controllers' JwtAuthGuard.
  // NotificationsModule provides the server-authoritative notification write
  // used by the lifecycle transitions (Task 10M).
  // AuditModule + StorageModule back the request-media lifecycle (Track B2):
  // private objects + presigned URLs through the shared StoragePort.
  imports: [AuthModule, NotificationsModule, AuditModule, StorageModule],
  controllers: [ServiceRequestsController, RequestMediaController],
  providers: [ServiceRequestsService, RequestMediaService],
  exports: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
