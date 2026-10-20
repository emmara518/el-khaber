/**
 * PostgreSQL-backed auth-endpoint rate limit.
 *
 * Applied only to routes decorated with `@AuthThrottle()`
 * (login/register/refresh/forgot-password/reset-password and admin
 * login/refresh). The generic @nestjs/throttler default limiter still
 * covers every route; this guard adds the tighter auth budget without
 * leaking it onto unrelated endpoints.
 *
 * Shared across instances because the counter lives in PostgreSQL
 * (rate_limit_buckets). Throws 429 RATE_LIMITED when exhausted.
 */

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AUTH_THROTTLE_METADATA_KEY } from '../decorators';
import { RateLimitedException } from '../errors';

import { RateLimitService } from './rate-limit.service';

import type { Request } from 'express';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<boolean | undefined>(
      AUTH_THROTTLE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (required !== true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? 'unknown';
    const result = await this.rateLimit.checkLimit('auth', ip);
    if (!result.allowed) {
      throw new RateLimitedException('Too many authentication attempts. Try again later.');
    }
    return true;
  }
}
