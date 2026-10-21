/**
 * Service-request media endpoints (Track B2). Identity from JWT; the
 * request id in the path is ownership/participation-checked server-side
 * against the verified subject — cross-account ids behave as missing.
 *
 * Flow: POST media/upload-url → PUT bytes to the returned URL →
 * POST media/confirm. The storage key is server-generated; clients never
 * choose it. Photos are viewable (short-lived presigned GET) by the
 * request participants only.
 */

import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { CurrentUser, Roles, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { RequestMediaService, type RequestMediaItem } from './request-media.service';

import type { ApiSuccess } from '@khabir/shared-types';

type Payload = Record<string, unknown>;

const mediaUploadUrlSchema = z.object({
  mime_type: z.string().trim().min(1).max(128),
});
type MediaUploadUrlInput = z.infer<typeof mediaUploadUrlSchema>;

const mediaConfirmSchema = z.object({
  storage_key: z.string().trim().min(4).max(512),
});
type MediaConfirmInput = z.infer<typeof mediaConfirmSchema>;

@ApiTags('service-requests')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing, malformed, or expired access token / role mismatch.')
@UseGuards(JwtAuthGuard)
@Controller('service-requests')
export class RequestMediaController {
  constructor(private readonly media: RequestMediaService) {}

  /**
   * POST /service-requests/:id/media/upload-url — owner-only presigned
   * PUT grant for a server-generated media key.
   */
  @Post(':id/media/upload-url')
  @HttpCode(200)
  @Roles('customer')
  @ApiZodBody(mediaUploadUrlSchema)
  @ApiEnvelopeOk('ServiceRequestMediaUploadUrlDto', 200, 'Presigned PUT URL + server-generated storage key.')
  @ApiEnvelopeError(404, 'Request not found or not owned by this customer.')
  @ApiEnvelopeError(409, 'Request cancelled or attachment limit reached.')
  async uploadUrl(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(mediaUploadUrlSchema)) body: MediaUploadUrlInput,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.media.requestUploadUrl(user.id, id, body.mime_type) };
  }

  /**
   * POST /service-requests/:id/media/confirm — owner-only confirm:
   * validates the uploaded object (HEAD + magic bytes) and records it.
   */
  @Post(':id/media/confirm')
  @HttpCode(201)
  @Roles('customer')
  @ApiZodBody(mediaConfirmSchema)
  @ApiEnvelopeOk('ServiceRequestMediaDto', 201, 'Photo validated and attached to the request.')
  @ApiEnvelopeError(404, 'Request not found or not owned by this customer.')
  @ApiEnvelopeError(409, 'Request cancelled or attachment limit reached.')
  @ApiEnvelopeError(400, 'Upload rejected (missing/oversized/non-image content or foreign key).')
  async confirm(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(mediaConfirmSchema)) body: MediaConfirmInput,
  ): Promise<ApiSuccess<RequestMediaItem>> {
    return { data: await this.media.confirmMedia(user.id, id, body.storage_key) };
  }

  /**
   * GET /service-requests/:id/media — participant-visible photo metadata
   * (no storage keys, deterministic order, bounded).
   */
  @Get(':id/media')
  @Roles('customer', 'technician')
  @ApiEnvelopeOk('ServiceRequestMediaDto', 200, 'Attached photos (metadata only) for participants.')
  @ApiEnvelopeError(404, 'Request not found or not visible to this account.')
  async list(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ): Promise<ApiSuccess<RequestMediaItem[]>> {
    return { data: await this.media.listMedia(user.id, user.role, id) };
  }

  /**
   * GET /service-requests/:id/media/:mediaId/url — participant-only
   * short-lived presigned GET for viewing one photo.
   */
  @Get(':id/media/:mediaId/url')
  @Roles('customer', 'technician')
  @ApiEnvelopeOk('ServiceRequestMediaUrlDto', 200, 'Short-lived presigned download URL for one photo.')
  @ApiEnvelopeError(404, 'Request/photo not found or not visible to this account.')
  async viewUrl(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
  ): Promise<ApiSuccess<Payload>> {
    return { data: await this.media.mediaUrl(user.id, user.role, id, mediaId) };
  }
}
