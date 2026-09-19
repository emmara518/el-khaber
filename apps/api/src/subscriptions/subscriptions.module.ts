/**
 * Subscriptions + manual payments + admin grants module (Task 10I).
 */

import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

import { AdminGrantsController, AdminNotificationsController, AdminPaymentsController } from './admin-payments.controller';
import { AdminProofController } from './admin-proof.controller';
import { PaymentsService } from './payments.service';
import { ProofController } from './proof.controller';
import { ProofService } from './proof.service';
import { MerchantSubscriptionController, SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  // AuthModule provides JwtModule (guard) + the admin/user JWT authorities.
  // NotificationsModule provides the server-authoritative notification write.
  imports: [AuthModule, AuditModule, NotificationsModule, StorageModule],
  controllers: [
    SubscriptionsController,
    MerchantSubscriptionController,
    AdminPaymentsController,
    AdminGrantsController,
    AdminNotificationsController,
    ProofController,
    AdminProofController,
  ],
  providers: [SubscriptionsService, PaymentsService, ProofService],
  exports: [SubscriptionsService, PaymentsService, ProofService],
})
export class SubscriptionsModule {}
