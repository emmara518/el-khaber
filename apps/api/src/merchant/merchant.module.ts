/**
 * Merchant domain module (Task 10G).
 */

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { MerchantProfileController } from './merchant.controller';
import { MerchantProfileService } from './merchant.service';
import { MerchantProductsController } from './products.controller';
import { MerchantProductsService } from './products.service';

@Module({
  // AuthModule provides JwtModule for the controllers' JwtAuthGuard.
  imports: [AuthModule],
  controllers: [MerchantProfileController, MerchantProductsController],
  providers: [MerchantProfileService, MerchantProductsService],
  exports: [MerchantProfileService, MerchantProductsService],
})
export class MerchantModule {}
