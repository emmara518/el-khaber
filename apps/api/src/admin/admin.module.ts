/**
 * Admin operational module (Task 10K).
 *
 * Registers the Admin operational controller and its services. These were
 * implemented in Task 10K but never wired into the application graph, so the
 * whole `/admin/*` operational surface (metrics, users, verification,
 * service-request override, review moderation, audit log) returned 404.
 * Discovered by the Task 10N real-HTTP E2E suite.
 */

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { AdminOperationsService } from './admin-operations.service';
import { AdminUsersService } from './admin-users.service';
import { AdminController } from './admin.controller';

@Module({
  // AuthModule provides the JwtModule used by the JwtAuthGuard; the admin
  // authority is enforced by @AuthKind('admin') on the controller.
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminUsersService, AdminOperationsService],
})
export class AdminModule {}
