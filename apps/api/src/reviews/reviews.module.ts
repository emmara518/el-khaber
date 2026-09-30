/**
 * Reviews module (Task 10H).
 */

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { ReviewTagsController, ServiceRequestReviewsController, TechnicianReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  // AuthModule provides JwtModule for the controllers' JwtAuthGuard.
  imports: [AuthModule],
  controllers: [TechnicianReviewsController, ServiceRequestReviewsController, ReviewTagsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
