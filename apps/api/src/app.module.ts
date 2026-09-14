import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';


import { AdminAuthModule } from './admin/admin-auth.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { ChatModule } from './chat/chat.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { AuthGuardModule } from './common/auth-guard.module';
import { HttpLoggingInterceptor } from './common/http-logging.interceptor';
import { JwtAuthGuard } from './common/jwt-auth.guard';
import { requestIdMiddleware } from './common/request-id.middleware';
import { securityHeaders } from './common/security-headers.middleware';
import { PrismaModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { LocationsModule } from './locations/locations.module';
import { MeModule } from './me/me.module';
import { MerchantModule } from './merchant/merchant.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TechnicianModule } from './technician/technician.module';

import type { MiddlewareConsumer, NestModule } from '@nestjs/common';

@Module({
  imports: [
    PrismaModule,
    AuthGuardModule,
    AuthModule,
    HealthModule,
    LocationsModule,
    MeModule,
    AdminAuthModule,
    AdminModule,
    CatalogModule,
    ServiceRequestsModule,
    MerchantModule,
    ChatModule,
    ReviewsModule,
    NotificationsModule,
    SubscriptionsModule,
    TechnicianModule,
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
    // Request-ID first so the whole lifecycle runs inside the correlation
    // context; security headers applied to every response (Task 11C).
    consumer.apply(requestIdMiddleware, securityHeaders).forRoutes('*');
  }
}
