/**
 * Merchant logo endpoints (WP-01).
 *
 * POST /merchant/profile/logo — multipart upload of the caller's own
 * store logo. DELETE /merchant/profile/logo — idempotent removal.
 *
 * Merchant-only (`@Roles('merchant')`); identity from the verified JWT.
 * See `me-avatar.controller.ts` for the shared upload contract.
 */

import { ERROR_CODE, type ApiSuccess } from '@khabir/shared-types';
import {
  Controller,
  Delete,
  HttpCode,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';

import { CurrentUser, Roles, type RequestUser } from '../common/decorators';
import { ApiException } from '../common/errors';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk } from '../common/openapi/decorators';

import { AvatarUploadInterceptor } from './avatar-upload.interceptor';
import { AvatarService } from './avatar.service';

import type { AvatarUploadedFile } from './avatar.types';

@ApiTags('merchant')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@ApiEnvelopeError(401, 'Missing/malformed token or non-merchant role.')
@UseGuards(JwtAuthGuard)
@Roles('merchant')
@Controller('merchant/profile')
export class MerchantAvatarController {
  constructor(private readonly avatars: AvatarService) {}

  @Post('logo')
  @HttpCode(201)
  @UseInterceptors(AvatarUploadInterceptor)
  @ApiConsumes('multipart/form-data')
  @ApiEnvelopeOk('MerchantLogoUploadDto', 201, 'Logo uploaded; public URL persisted.')
  @ApiEnvelopeError(413, 'Image exceeds the maximum size.')
  @ApiEnvelopeError(429, 'Too many logo uploads.')
  async uploadLogo(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: AvatarUploadedFile | undefined,
  ): Promise<ApiSuccess<{ logoUrl: string }>> {
    if (file === undefined) {
      throw new ApiException(
        ERROR_CODE.UPLOAD_REJECTED,
        'Send one image in the `file` field.',
        400,
      );
    }
    const result = await this.avatars.uploadAvatar({
      userId: user.id,
      kind: 'merchant',
      bytes: new Uint8Array(file.buffer.buffer, file.buffer.byteOffset, file.buffer.byteLength),
      sizeBytes: file.size,
    });
    return { data: { logoUrl: result.publicUrl } };
  }

  @Delete('logo')
  @HttpCode(204)
  async deleteLogo(@CurrentUser() user: RequestUser): Promise<void> {
    await this.avatars.deleteAvatar(user.id, 'merchant');
  }
}
