import type { AuthSessionDto } from '@khabir/shared-types';
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from '@khabir/shared-validation';
import { Body, Controller, HttpCode, Post, Req, Res, UsePipes } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AuthThrottle, Public } from '../common/decorators';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

import { AuthService } from './auth.service';
import {
  assertAllowedWebOrigin,
  assertWebSessionCsrf,
  clearWebSessionCookies,
  createWebSessionCsrfToken,
  getWebSessionRefreshToken,
  setWebSessionCookies,
} from './web-session-cookie';

@ApiTags('auth')
@Controller('auth/web/session')
export class WebAuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(201)
  @AuthThrottle()
  @UsePipes(new ZodValidationPipe(loginSchema))
  webLogin(@Body() body: LoginInput, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertAllowedWebOrigin(req);
    return this.issueSession(body, req, res, 'login');
  }

  @Public()
  @Post('register')
  @HttpCode(201)
  @AuthThrottle()
  @UsePipes(new ZodValidationPipe(registerSchema))
  webRegister(
    @Body() body: RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    assertAllowedWebOrigin(req);
    return this.issueSession(body, req, res, 'register');
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @AuthThrottle()
  webRefresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    assertAllowedWebOrigin(req);
    assertWebSessionCsrf(req);
    return this.rotateSession(res, req);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @AuthThrottle()
  async webLogout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    assertAllowedWebOrigin(req);
    assertWebSessionCsrf(req);
    await this.blogout(res, req);
  }

  private async issueSession(
    body: LoginInput | RegisterInput,
    req: Request,
    res: Response,
    kind: 'login' | 'register',
  ) {
    const result: AuthSessionDto =
      kind === 'login'
        ? await this.auth.login(body as LoginInput, {
            ipAddress: req.ip ?? undefined,
            userAgent: req.headers['user-agent'] ?? undefined,
          })
        : await this.auth.register(body as RegisterInput, {
            ipAddress: req.ip ?? undefined,
            userAgent: req.headers['user-agent'] ?? undefined,
          });
    const csrfToken = createWebSessionCsrfToken();
    setWebSessionCookies(res, result.refreshToken, csrfToken);
    return {
      data: {
        accessToken: result.accessToken,
        csrfToken,
        expiresIn: result.expiresIn,
        user: result.user,
      },
    };
  }

  private async rotateSession(res: Response, req: Request) {
    const token = getWebSessionRefreshToken(req);
    if (token === null) {
      return {
        error: { code: 'AUTH_REQUIRED', message: 'HttpOnly session cookie missing' },
      };
    }
    const result = await this.auth.refresh(token, {
      ipAddress: req.ip ?? undefined,
      userAgent: req.headers['user-agent'] ?? undefined,
    });
    const csrfToken = createWebSessionCsrfToken();
    setWebSessionCookies(res, result.refreshToken, csrfToken);
    return {
      data: {
        accessToken: result.accessToken,
        csrfToken,
        expiresIn: result.expiresIn,
        user: result.user,
      },
    };
  }

  private async blogout(res: Response, req: Request): Promise<void> {
    const token = getWebSessionRefreshToken(req);
    if (token !== null) {
      await this.auth.logout(token);
    }
    clearWebSessionCookies(res);
  }
}



