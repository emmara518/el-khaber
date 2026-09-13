/**
 * Service Request lifecycle module (Task 10F).
 */

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { ServiceRequestsController } from './service-requests.controller';
import { ServiceRequestsService } from './service-requests.service';

@Module({
  // AuthModule provides JwtModule for the controller's JwtAuthGuard.
  // NotificationsModule provides the server-authoritative notification write
  // used by the lifecycle transitions (Task 10M).
  imports: [AuthModule, NotificationsModule],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService],
  exports: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
