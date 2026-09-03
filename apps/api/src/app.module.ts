import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, Reflector } from '@nestjs/core';

import { AdminAuthModule } from './admin/admin-auth.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { AuthGuardModule } from './common/auth-guard.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { PrismaModule } from './database/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthGuardModule,
    AuthModule,
    HealthModule,
    MeModule,
    AdminAuthModule,
  ],
  providers: [
    Reflector,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule {}



