import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { getConfig } from '../config/app.config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

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
    // Apply rate limiting to all routes. The tighter auth limiter is used
    // via the `@Throttle({ default: { limit: <authMax> } })` decorator on
    // individual auth routes below.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
