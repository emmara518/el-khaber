/**
 * Locations module (Task REM-001).
 */

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';

@Module({
  // AuthModule provides JwtModule for the controller's JwtAuthGuard.
  imports: [AuthModule],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
