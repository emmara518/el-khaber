/**
 * Store module (Phase D) — public product read surface.
 *
 * Exposes active merchant products to Customer/Technician clients without
 * merchant-management privileges. Reuses the existing Product entity.
 */

import { Module } from '@nestjs/common';

import { StoreProductsController } from './products.controller';
import { StoreProductsService } from './products.service';

@Module({
  controllers: [StoreProductsController],
  providers: [StoreProductsService],
  exports: [StoreProductsService],
})
export class StoreModule {}
