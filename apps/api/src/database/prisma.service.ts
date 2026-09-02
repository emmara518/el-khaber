import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma service. Exposes the generated Prisma client as a Nest provider.
 * The `PrismaClient` is the only object allowed to talk to the database;
 * controllers, services, and guards must never construct their own.
 *
 * `onModuleInit` attempts to connect but does NOT throw when the database
 * is unavailable. The process stays up so the `/ready` endpoint can
 * report the degraded state with HTTP 503, which is the correct posture
 * for a platform orchestrator (Kubernetes, ECS, etc.) to observe.
 * Source: docs/05_TECH_ARCHITECTURE.md §16, docs/10_ENGINEERING_RULES.md §15.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.connected = true;
    } catch (err) {
      this.logger.error(
        `Database connection failed at startup. The API will start in degraded mode. ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.$disconnect();
    }
  }
}
