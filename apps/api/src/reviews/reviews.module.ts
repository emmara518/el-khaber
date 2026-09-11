/**
 * Reviews module (Task 10H).
 */

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { ServiceRequestReviewsController, TechnicianReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  // AuthModule provides JwtModule for the controllers' JwtAuthGuard.
  imports: [AuthModule],
  controllers: [TechnicianReviewsController, ServiceRequestReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
