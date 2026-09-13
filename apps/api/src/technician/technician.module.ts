/**
 * Technician self-service module (Task 10J-R1).
 */

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { TechnicianSelfController } from './technician-self.controller';
import { TechnicianSelfService } from './technician-self.service';

@Module({
  // AuthModule provides JwtModule for the controller's JwtAuthGuard.
  imports: [AuthModule],
  controllers: [TechnicianSelfController],
  providers: [TechnicianSelfService],
  exports: [TechnicianSelfService],
})
export class TechnicianModule {}
