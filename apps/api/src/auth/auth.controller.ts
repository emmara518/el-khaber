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
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../common/decorators';
import {
  ApiEnvelopeError,
  ApiEnvelopeOk,
  ApiZodBody,
} from '../common/openapi/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';

import type { ApiSuccess, AuthSessionDto } from '@khabir/shared-types';
import type { Request } from 'express';

// Tighter rate limit on auth-sensitive endpoints per docs/05_TECH_ARCHITECTURE.md §6.
const authThrottle = (): MethodDecorator => Throttle({ auth: {} });

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  @authThrottle()
  @UsePipes(new ZodValidationPipe(registerSchema))
  @ApiZodBody(registerSchema)
  @ApiEnvelopeOk('AuthSessionDto', 201, 'Account created; session issued.')
  @ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
  @ApiEnvelopeError(409, 'Phone or email already in use (canonical error envelope).')
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
  @ApiZodBody(loginSchema)
  @ApiEnvelopeOk('AuthSessionDto', 200, 'Session issued.')
  @ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
  @ApiEnvelopeError(401, 'Invalid credentials (canonical error envelope).')
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
  @ApiZodBody(refreshSchema)
  @ApiEnvelopeOk('AuthSessionDto', 200, 'Rotated session issued.')
  @ApiEnvelopeError(401, 'Invalid, expired, or replayed refresh token.')
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
  @ApiZodBody(logoutSchema)
  @ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
  async logout(@Body() body: LogoutInput): Promise<void> {
    await this.auth.logout(body.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(202)
  @authThrottle()
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  @ApiZodBody(forgotPasswordSchema)
  @ApiEnvelopeOk('AcceptedDto', 202, 'Always 202; never reveals whether the account exists.')
  @ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
  async forgotPassword(
    @Body() _body: ForgotPasswordInput,
  ): Promise<ApiSuccess<{ accepted: true }>> {
    // Issue a reset token (or no-op if the contact channel is unknown).
    // The HTTP response intentionally reveals NOTHING about whether a
    // user matched, whether a token was issued, or anything about the
    // token itself. Notification delivery is a separate concern handled
    // by the future notification adapter which will receive the raw
    // token from the service layer (see PasswordResetService).
    await this.passwordReset.requestReset(_body);
    return { data: { accepted: true } };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(204)
  @authThrottle()
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  @ApiZodBody(resetPasswordSchema)
  @ApiEnvelopeError(400, 'Validation failed (canonical error envelope).')
  @ApiEnvelopeError(401, 'Invalid, expired, or already-used reset token.')
  async resetPassword(@Body() body: ResetPasswordInput): Promise<void> {
    await this.passwordReset.consumeReset({
      token: body.token,
      newPassword: body.password,
    });
  }
}
