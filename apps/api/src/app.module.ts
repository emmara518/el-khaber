import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';

import { AdminAuthModule } from './admin/admin-auth.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuardModule } from './common/auth-guard.module';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';

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
  ],
})
export class AppModule {}


