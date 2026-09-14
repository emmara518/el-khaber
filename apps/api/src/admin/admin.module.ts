/**
 * Admin operational module (Task 10K).
 *
 * Registers the Admin operational controller and its services
 * (`/admin/*`: metrics, users, verification, service-request override,
 * review moderation, audit log). The module registration itself was the
 * 10N fix for the unwired-controller 404.
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
