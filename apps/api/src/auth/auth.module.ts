import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { getConfig } from '../config/app.config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginAttemptGuard } from './login-attempt.guard';
import {
  DeferredPasswordResetDelivery,
  PASSWORD_RESET_DELIVERY,
} from './password-reset-delivery.port';
import { PasswordResetService } from './password-reset.service';

@Module({
  imports: [
    JwtModule.register({}),
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        const config = getConfig();
        return {
          throttlers: [
            { name: 'default', ttl: config.rateLimit.ttlSeconds * 1000, limit: config.rateLimit.max },
            { name: 'auth', ttl: config.rateLimit.ttlSeconds * 1000, limit: config.rateLimit.authMax },
          ],
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordResetService,
    LoginAttemptGuard,
    // Provider-agnostic delivery boundary (Task 10D §4). No delivery
    // provider is approved yet; the deferred no-op never claims delivery.
    { provide: PASSWORD_RESET_DELIVERY, useClass: DeferredPasswordResetDelivery },
    // Apply rate limiting to all routes. The tighter auth limiter is used
    // via the `@Throttle({ default: { limit: <authMax> } })` decorator on
    // individual auth routes below.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [AuthService, PasswordResetService, LoginAttemptGuard, JwtModule],
})
export class AuthModule {}
