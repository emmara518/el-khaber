import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthRateLimitGuard } from '../common/rate-limit/auth-rate-limit.guard';

import { getConfig } from '../config/app.config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpPasswordResetDelivery } from './http-password-reset-delivery';
import { LoginAttemptGuard } from './login-attempt.guard';
import {
  DeferredPasswordResetDelivery,
  PASSWORD_RESET_DELIVERY,
} from './password-reset-delivery.port';
import { PasswordResetService } from './password-reset.service';
import { RateLimitService } from '../common/rate-limit/rate-limit.service';
import { SharedStoreLoginAttemptGuard } from '../common/rate-limit/shared-store-login-attempt.guard';

@Module({
  imports: [
    JwtModule.register({}),
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const config = getConfig();
        return {
          // ONLY the general limiter is global. Every named throttler in
          // this array would apply to every route, so the auth budget is a
          // dedicated metadata-scoped guard instead.
          throttlers: [
            { name: 'default', ttl: config.rateLimit.ttlSeconds * 1000, limit: config.rateLimit.max },
          ],
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetService,
    RateLimitService,
    SharedStoreLoginAttemptGuard,
    LoginAttemptGuard,
    // Provider-agnostic delivery boundary (Task 10D §4). When
    // PASSWORD_RESET_DELIVERY_URL is configured, a real HTTP webhook
    // adapter is used; otherwise the deferred no-op never claims delivery.
    {
      provide: PASSWORD_RESET_DELIVERY,
      useFactory: () => {
        const url = process.env['PASSWORD_RESET_DELIVERY_URL']?.trim();
        if (url !== undefined && url.length > 0) {
          const config = getConfig();
          const isHttps = /^https:\/\//u.test(url);
          const isHttp = /^http:\/\//u.test(url);
          if (config.env === 'production' && !isHttps) {
            throw new Error('PASSWORD_RESET_DELIVERY_URL must use https in production');
          }
          if (isHttp || isHttps) {
            const token = process.env['PASSWORD_RESET_DELIVERY_TOKEN']?.trim() ?? '';
            return new HttpPasswordResetDelivery(url, token.length > 0 ? token : null);
          }
        }
        return new DeferredPasswordResetDelivery();
      },
    },
    // Apply the general request budget to all routes (per-instance
    // in-memory). The tighter auth budget is applied only to routes marked
    // @AuthThrottle() (login/register/refresh/forgot/reset + admin
    // login/refresh) by AuthRateLimitGuard, backed by PostgreSQL.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Tighter, PostgreSQL-backed budget scoped to @AuthThrottle() routes.
    { provide: APP_GUARD, useClass: AuthRateLimitGuard },
  ],
  exports: [AuthService, PasswordResetService, RateLimitService, SharedStoreLoginAttemptGuard, LoginAttemptGuard, JwtModule],
})
export class AuthModule {}
