/**
 * Catalog + content domain module (Task 10E).
 * Read-only customer/content APIs: appliance categories, fault guide,
 * service catalog, technician discovery. All public per docs/07_API.md §6.
 */

import { Module } from '@nestjs/common';

import { ApplianceCategoriesController } from './appliances.controller';
import { ApplianceCategoriesService } from './appliances.service';
import { FaultsController } from './faults.controller';
import { FaultsService } from './faults.service';
import { ServiceCatalogController } from './service-catalog.controller';
import { ServiceCatalogService } from './service-catalog.service';
import { TechniciansController } from './technicians.controller';
import { TechniciansService } from './technicians.service';

@Module({
  controllers: [
    ApplianceCategoriesController,
    FaultsController,
    ServiceCatalogController,
    TechniciansController,
  ],
  providers: [
    ApplianceCategoriesService,
    FaultsService,
    ServiceCatalogService,
    TechniciansService,
  ],
  exports: [ApplianceCategoriesService, FaultsService, ServiceCatalogService, TechniciansService],
})
export class CatalogModule {}
