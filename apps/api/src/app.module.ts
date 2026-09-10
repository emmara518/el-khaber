import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';


import { AdminAuthModule } from './admin/admin-auth.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { AuthGuardModule } from './common/auth-guard.module';
import { HttpLoggingInterceptor } from './common/http-logging.interceptor';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { requestIdMiddleware } from './common/request-id.middleware';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';

import type { MiddlewareConsumer, NestModule } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule,
    AuthGuardModule,
    AuthModule,
    HealthModule,
    MeModule,
    AdminAuthModule,
    CatalogModule,
  ],
  providers: [
    Reflector,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Structured request logging. Error responses are logged by the
    // ApiExceptionFilter; this interceptor logs successful responses only.
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  // The request-ID middleware MUST run before everything else so the
  // whole request lifecycle executes inside the correlation context.
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(requestIdMiddleware).forRoutes('*');
  }
}
