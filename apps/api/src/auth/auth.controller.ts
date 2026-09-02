/**
 * Auth controller. Exposes the six authentication endpoints defined in
 * docs/07_API.md §4. All endpoints are `@Public()` — the JwtAuthGuard
 * does not gate them. Rate limiting is applied per docs/05_TECH_ARCHITECTURE.md §6
 * and the throttler configuration in the module.
 */


import {
  forgotPasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type LogoutInput,
  type RefreshInput,
  type RegisterInput,
  type ResetPasswordInput,
} from '@khabir/shared-validation';
import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { type AuthService } from './auth.service';

import type { ApiSuccess, AuthSessionDto } from '@khabir/shared-types';
import type { Request } from 'express';

// Tighter rate limit on auth-sensitive endpoints per docs/05_TECH_ARCHITECTURE.md §6.
const authThrottle = (): MethodDecorator => Throttle({ auth: {} });

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  @authThrottle()
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(
    @Body() body: RegisterInput,
    @Req() req: Request,
  ): Promise<ApiSuccess<AuthSessionDto>> {
    return this.auth
      .register(body, { userAgent: req.headers['user-agent'], ipAddress: req.ip })
      .then((data) => ({ data }));
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @authThrottle()
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(
    @Body() body: LoginInput,
    @Req() req: Request,
  ): Promise<ApiSuccess<AuthSessionDto>> {
    return this.auth
      .login(body, { userAgent: req.headers['user-agent'], ipAddress: req.ip })
      .then((data) => ({ data }));
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @authThrottle()
  @UsePipes(new ZodValidationPipe(refreshSchema))
  refresh(
    @Body() body: RefreshInput,
    @Req() req: Request,
  ): Promise<ApiSuccess<AuthSessionDto>> {
    return this.auth
      .refresh(body.refreshToken, { userAgent: req.headers['user-agent'], ipAddress: req.ip })
      .then((data) => ({ data }));
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @authThrottle()
  @UsePipes(new ZodValidationPipe(logoutSchema))
  async logout(@Body() body: LogoutInput): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  @authThrottle()
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  async forgotPassword(
    @Body() _body: ForgotPasswordInput,
  ): Promise<ApiSuccess<{ accepted: true }>> {
    // The reset-token issuance/email/SMS channel belongs to a later task
    // (notification provider is not in MVP per CTO amendment). The endpoint
    // exists, validates input, and always returns 202 to avoid leaking
    // whether a contact channel is registered.
    return { data: { accepted: true } };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(204)
  @authThrottle()
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  async resetPassword(@Body() _body: ResetPasswordInput): Promise<void> {
    // Reset-token consumption and password rotation also belong to a later
    // task (notification channel required). The endpoint is reserved here
    // so the API surface matches docs/07_API.md §4.
  }
}
