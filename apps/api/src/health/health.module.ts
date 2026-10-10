import { Module } from '@nestjs/common';

import { HealthController, HealthService } from './health.controller';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}

