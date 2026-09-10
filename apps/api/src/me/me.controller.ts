/**
 * Current-user controller. Returns the authenticated user's safe profile.
 * The user ID is taken from the verified JWT in `request.user` — never
 * from the request body or query — per docs/10_ENGINEERING_RULES.md §15.
 *
 * The returned record is the public `AuthUserDto`: no password hash, no
 * refresh tokens, no internal fields.
 *
 * PATCH updates only shared contact fields (phone/email) per
 * docs/07_API.md §5. Role, status, verification flags, and credentials
 * are not writable — the zod schema strips any unknown keys before the
 * service layer runs.
 */

import { updateMeSchema, type UpdateMeInput } from '@khabir/shared-validation';
import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';


import { AuthService } from '../auth/auth.service';
import { CurrentUser, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ApiEnvelopeError, ApiEnvelopeOk, ApiZodBody } from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import type { ApiSuccess, MeDto } from '@khabir/shared-types';

@ApiTags('me')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(401, 'Missing, malformed, or expired access token.')
@ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  @ApiEnvelopeOk('MeDto', 200, 'Current authenticated user.')
  async me(@CurrentUser() current: RequestUser): Promise<ApiSuccess<MeDto>> {
    const user = await this.auth.findUserById(current.id);
    return { data: user };
  }

  @Patch()
  @ApiZodBody(updateMeSchema)
  @ApiEnvelopeOk('MeDto', 200, 'Updated user (contact fields changed).')
  @ApiEnvelopeError(409, 'Phone or email already in use (canonical error envelope).')
  async updateMe(
    @CurrentUser() current: RequestUser,
    @Body(new ZodValidationPipe(updateMeSchema)) body: UpdateMeInput,
  ): Promise<ApiSuccess<MeDto>> {
    const user = await this.auth.updateContactInfo(current.id, body);
    return { data: user };
  }
}
