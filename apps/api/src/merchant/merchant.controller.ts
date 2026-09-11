/**
 * Merchant profile endpoints (Task 10G).
 * Source: docs/07_API.md §17. Merchant-only; identity resolved from the JWT.
 */

import { merchantProfileUpdateSchema, type MerchantProfileUpdateInput } from '@khabir/shared-validation';
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


import { CurrentUser, Roles, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { MerchantProfileService } from './merchant.service';

import type { ApiSuccess, MerchantProfileDto } from '@khabir/shared-types';

@ApiTags('merchant')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing/malformed token or non-merchant role.')
@UseGuards(JwtAuthGuard)
@Roles('merchant')
@Controller('merchant')
export class MerchantProfileController {
  constructor(private readonly profile: MerchantProfileService) {}

  @Get('profile')
  @ApiEnvelopeOk('MerchantProfileDto', 200, 'Own merchant profile (verification status read-only).')
  @ApiEnvelopeError(404, 'Merchant profile not found (onboarding not completed).')
  async getProfile(@CurrentUser() user: RequestUser): Promise<ApiSuccess<MerchantProfileDto>> {
    return { data: await this.profile.getProfile(user.id) };
  }

  @Patch('profile')
  @ApiZodBody(merchantProfileUpdateSchema)
  @ApiEnvelopeOk('MerchantProfileDto', 200, 'Profile updated; creates the profile when absent (onboarding).')
  @ApiEnvelopeError(404, 'Referenced location not found or not owned.')
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(merchantProfileUpdateSchema)) body: MerchantProfileUpdateInput,
  ): Promise<ApiSuccess<MerchantProfileDto>> {
    return { data: await this.profile.updateProfile(user.id, body) };
  }
}
