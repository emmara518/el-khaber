/**
 * Subscriptions + manual payments + admin grants module (Task 10I).
 */

import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

import { AdminGrantsController, AdminNotificationsController, AdminPaymentsController } from './admin-payments.controller';
import { PaymentsService } from './payments.service';
import { MerchantSubscriptionController, SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  // AuthModule provides JwtModule (guard) + the admin/user JWT authorities.
  imports: [AuthModule, AuditModule],
  controllers: [
    SubscriptionsController,
    MerchantSubscriptionController,
    AdminPaymentsController,
    AdminGrantsController,
    AdminNotificationsController,
  ],
  providers: [SubscriptionsService, PaymentsService],
  exports: [SubscriptionsService, PaymentsService],
})
export class SubscriptionsModule {}
