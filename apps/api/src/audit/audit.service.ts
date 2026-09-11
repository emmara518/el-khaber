/**
 * Audit service (Task 10I). Uses the Task 10B audit_logs foundation —
 * no second audit system. Admin actors are recorded via actorAdminId
 * (admin accounts are a separate authority from users).
 */

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';

export interface AuditInput {
  actorUserId?: string | null;
  actorAdminId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorAdminId: input.actorAdminId ?? null,
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        beforeJson: (input.before ?? undefined) as never,
        afterJson: (input.after ?? undefined) as never,
      },
    });
  }
}
