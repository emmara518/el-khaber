/**
 * Audit module (Task 10I) — shared audit logging over the 10B foundation.
 */

import { Module } from '@nestjs/common';

import { AuditService } from './audit.service';

@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
