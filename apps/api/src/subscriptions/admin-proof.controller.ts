/**
 * ADMIN payment-proof retrieval (PHASE 20). Admin authority only
 * (@AuthKind('admin')). Issues a short-lived presigned GET so reviewers
 * can inspect the proof without any public URL ever existing.
 */

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { AuthKind, CurrentUser, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk } from '../common/openapi/decorators';

import { ProofService } from './proof.service';

import type { ApiSuccess } from '@khabir/shared-types';

type Payload = Record<string, unknown>;

@ApiTags('admin-payments')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Admin authority required.')
@UseGuards(JwtAuthGuard)
@AuthKind('admin')
@Controller('admin/payments')
export class AdminProofController {
  constructor(private readonly proofs: ProofService) {}

  /** GET /admin/payments/submissions/:id/proof-url — short-lived proof view URL. */
  @Get('submissions/:id/proof-url')
  @ApiEnvelopeOk('ProofDownloadUrlDto', 200, 'Short-lived presigned GET for the bound proof (audited).')
  @ApiEnvelopeError(404, 'Submission not found or no proof attached.')
  async proofUrl(
    @CurrentUser() admin: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.proofs.adminProofUrl(admin.id, id) };
  }
}
