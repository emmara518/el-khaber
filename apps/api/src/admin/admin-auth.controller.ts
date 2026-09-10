/**
 * Admin auth controller. Exposes login, refresh, logout, and a
 * `/admin/me` endpoint. The refresh and logout bodies match the user
 * auth flow but use the admin refresh-token table.
 *
 * There is intentionally no `/admin/auth/register` endpoint. Admin
 * accounts are seeded or created out-of-band per docs/09_ADMIN.md §2.
 *
 * Source: docs/09_ADMIN.md, Task #002 §18.
 */

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';


import { AuthKind, CurrentUser, Public, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import {
  ApiEnvelopeError,
  ApiEnvelopeOk,
  ApiZodBody,
} from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { AdminAuthService } from './admin-auth.service';

import type { ApiSuccess, AuthSessionDto, MeDto } from '@khabir/shared-types';
import type { Request } from 'express';

const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

const adminRefreshSchema = z.object({
  refreshToken: z.string().min(20).max(4096),
});

const adminLogoutSchema = z.object({
  refreshToken: z.string().min(20).max(4096),
});

type AdminLoginInput = z.infer<typeof adminLoginSchema>;
type AdminRefreshInput = z.infer<typeof adminRefreshSchema>;
type AdminLogoutInput = z.infer<typeof adminLogoutSchema>;

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ auth: {} })
  @UsePipes(new ZodValidationPipe(adminLoginSchema))
  @ApiZodBody(adminLoginSchema)
  @ApiEnvelopeOk('AuthSessionDto', 200, 'Admin session issued (separate authority).')
  @ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
  @ApiEnvelopeError(401, 'Invalid credentials.')
  login(
    @Body() body: AdminLoginInput,
    @Req() req: Request,
  ): Promise<ApiSuccess<AuthSessionDto>> {
    return this.auth
      .login(body, { userAgent: req.headers['user-agent'], ipAddress: req.ip })
      .then((data) => ({ data }));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @Throttle({ auth: {} })
  @UsePipes(new ZodValidationPipe(adminRefreshSchema))
  @ApiZodBody(adminRefreshSchema)
  @ApiEnvelopeOk('AuthSessionDto', 200, 'Rotated admin session issued.')
  @ApiEnvelopeError(401, 'Invalid, expired, or replayed refresh token.')
  refresh(
    @Body() body: AdminRefreshInput,
    @Req() req: Request,
  ): Promise<ApiSuccess<AuthSessionDto>> {
    return this.auth
      .refresh(body.refreshToken, { userAgent: req.headers['user-agent'], ipAddress: req.ip })
      .then((data) => ({ data }));
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @Throttle({ auth: {} })
  @UsePipes(new ZodValidationPipe(adminLogoutSchema))
  @ApiZodBody(adminLogoutSchema)
  async logout(@Body() body: AdminLogoutInput): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }
}

@ApiTags('admin-auth')
@ApiBearerAuth('bearer')
@ApiEnvelopeError(401, 'Missing, malformed, or expired admin access token.')
@UseGuards(JwtAuthGuard)
@AuthKind('admin')
@Controller('admin/me')
export class AdminMeController {
  constructor(private readonly auth: AdminAuthService) {}

  @Get()
  async me(@CurrentUser() _current: RequestUser): Promise<ApiSuccess<MeDto>> {
    // Current user's id is derived from the verified JWT (request.user).
    // The actual admin record is fetched server-side.
    // For Task #002 the admin identity is the same shape used by /me.
    const user = await this.auth.findAdminById(_current.id);
    return { data: user };
  }
}
