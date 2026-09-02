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
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';


import { AuthKind, CurrentUser, Public, type RequestUser } from '../common/decorators';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { type AdminAuthService } from './admin-auth.service';

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

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ auth: {} })
  @UsePipes(new ZodValidationPipe(adminLoginSchema))
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
  async logout(@Body() body: AdminLogoutInput): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }
}

@Controller('admin/me')
@UseGuards(JwtAuthGuard)
@AuthKind('admin')
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
