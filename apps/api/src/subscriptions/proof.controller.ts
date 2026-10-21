/**
 * Payment-proof upload endpoints (PHASE 20). Identity from JWT; the
 * submission id in the path is ownership-checked server-side against the
 * verified subject — cross-account ids behave as missing (404).
 *
 * Flow: POST proof-upload-url → PUT bytes to the returned upload URL →
 * POST proof-confirm. The storage key is server-generated; clients never
 * choose it.
 */

import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { CurrentUser, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { ProofService } from './proof.service';

import type { ApiSuccess } from '@khabir/shared-types';

type Payload = Record<string, unknown>;

const proofUploadUrlSchema = z.object({
  mime_type: z.string().trim().min(1).max(128),
});
type ProofUploadUrlInput = z.infer<typeof proofUploadUrlSchema>;

const proofConfirmSchema = z.object({
  storage_key: z.string().trim().min(4).max(512),
});
type ProofConfirmInput = z.infer<typeof proofConfirmSchema>;

@ApiTags('subscriptions')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing/malformed token or role mismatch.')
@UseGuards(JwtAuthGuard)
@Controller()
export class ProofController {
  constructor(private readonly proofs: ProofService) {}

  /**
   * POST /subscriptions/:id/proof-upload-url — owner-only presigned PUT
   * grant for a server-generated proof key.
   */
  @Post('subscriptions/:id/proof-upload-url')
  @HttpCode(200)
  @ApiZodBody(proofUploadUrlSchema)
  @ApiEnvelopeOk('ProofUploadUrlDto', 200, 'Presigned PUT URL + server-generated storage key.')
  @ApiEnvelopeError(404, 'Submission not found or not owned.')
  @ApiEnvelopeError(409, 'Submission already reviewed.')
  async requestUploadUrl(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(proofUploadUrlSchema)) body: ProofUploadUrlInput,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.proofs.requestUploadUrl(user.id, id, body.mime_type) };
  }

  /**
   * POST /subscriptions/:id/proof-confirm — owner-only confirm: validates
   * the uploaded object (HEAD + magic bytes) and binds the key.
   */
  @Post('subscriptions/:id/proof-confirm')
  @HttpCode(200)
  @ApiZodBody(proofConfirmSchema)
  @ApiEnvelopeOk('PaymentSubmissionDto', 200, 'Proof validated and bound to the submission.')
  @ApiEnvelopeError(404, 'Submission not found or not owned.')
  @ApiEnvelopeError(409, 'Submission already reviewed.')
  @ApiEnvelopeError(400, 'Upload rejected (missing/oversized/non-image content or foreign key).')
  async confirmProof(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(proofConfirmSchema)) body: ProofConfirmInput,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.proofs.confirmProof(user.id, id, body.storage_key) };
  }
}
