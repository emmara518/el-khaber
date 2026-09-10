/**
 * Service Request lifecycle module (Task 10F).
 */

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { ServiceRequestsController } from './service-requests.controller';
import { ServiceRequestsService } from './service-requests.service';

@Module({
  // AuthModule provides JwtModule for the controller's JwtAuthGuard.
  imports: [AuthModule],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService],
  exports: [ServiceRequestsService],
})
export class ServiceRequestsModule {}
