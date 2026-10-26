import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { config as loadDotenv } from 'dotenv';

import { AppModule } from './app.module';
import { configureApp } from './bootstrap/configure-app';
import { NestStructuredLogger } from './common/structured-logger';
import { getConfig } from './config/app.config';

// Load environment variables from .env (development) before reading config.
// In production, variables are provided by the platform (no .env file).
loadDotenv();

/**
 * Safe database target for startup diagnostics: host/port/database only.
 * Credentials are NEVER included (docs/10 §24).
 */
function describeDatabase(url: string): string {
  try {
    const u = new URL(url);
    const db = u.pathname.replace(/^\//, '');
    return `${u.hostname}${u.port.length > 0 ? `:${u.port}` : ''}/${db}`;
  } catch {
    return 'unknown';
  }
}

async function bootstrap(): Promise<void> {
  const config = getConfig();
  const logger = new Logger('Bootstrap');

  // Topology facts (docs/11 §7.2, updated AUD-007):
  //   - HTTP request throttling (@nestjs/throttler) uses its DEFAULT
  //     in-process storage. Each API instance therefore has its own budget:
  //     N instances multiply the effective per-IP request rate by N.
  //   - Failed-login lockout IS shared through PostgreSQL
  //     (rate_limit_buckets via RateLimitService), so lock state is global.
  // MULTI_INSTANCE=true is allowed for the shared lockout, but the request
  // budget must be sized with the instance count in mind.
  const multiInstance = (process.env['MULTI_INSTANCE'] ?? '').trim().toLowerCase() === 'true';
  const sharedStore = (process.env['SHARED_STORE_URL'] ?? '').trim();
  if (multiInstance) {
    logger.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'info',
        event: 'topology-multi-instance',
        sharedStoreLegacy: sharedStore.length > 0,
        message:
          'MULTI_INSTANCE=true. Failed-login lockout is PostgreSQL-backed and shared. HTTP request throttling is per-instance (in-memory): the effective per-IP request budget is multiplied by the instance count. SHARED_STORE_URL is legacy/unused.',
      }),
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  app.useLogger(new NestStructuredLogger());

  // Graceful shutdown: stop accepting connections and run lifecycle hooks
  // (Prisma disconnects in `onModuleDestroy`) before the process exits.
  app.enableShutdownHooks(['SIGTERM', 'SIGINT']);

  configureApp(app);

  // Startup diagnostics (Task 11D). Non-secret configuration only.
  logger.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      event: 'startup',
      env: config.env,
      pid: process.pid,
      port: config.port,
      globalPrefix: config.globalPrefix,
      corsOrigins: config.corsOrigins.length,
      database: describeDatabase(config.databaseUrl),
      trustProxyHops: config.trustProxyHops,
    }),
  );

  // Proxy-trust notice (AUD-007). Keeps the reverse-proxy contract visible
  // in production logs on every boot: if the actual topology changes (more
  // hops between the client and this app), TRUST_PROXY_HOPS must be
  // updated accordingly or req.ip will be wrong (either the raw proxy IP
  // at 0 hops, or spoofable beyond the true last trusted proxy).
  if (config.env === 'production') {
    logger.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'warn',
        event: 'proxy-trust-notice',
        trustProxyHops: config.trustProxyHops,
        replicas: (process.env['REPLICAS'] ?? '1').trim(),
        message:
          'trust proxy = numeric hops; req.ip = client IP from the X-Forwarded-For entry appended by the LAST trusted proxy (Render = 1 hop). Update TRUST_PROXY_HOPS if the proxy topology changes.',
      }),
    );
  }

  // Multi-instance note (docs/11 §7.2): failed-login lockout is
  // PostgreSQL-backed (shared via the database). HTTP request throttling
  // is per-instance in-memory. This notice keeps the real topology visible
  // in production logs on every boot.
  if (config.env === 'production') {
    logger.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'warn',
        event: 'topology-notice',
        topology: multiInstance ? 'multi-instance' : 'single-instance',
        replicas: (process.env['REPLICAS'] ?? '1').trim(),
        multiInstance,
        message:
          'Failed-login lockout uses the PostgreSQL shared store (Prisma). HTTP request throttling is per-instance in-memory; size RATE_LIMIT_MAX/AUTH_RATE_LIMIT_MAX for the number of instances. SHARED_STORE_URL is legacy/unused.',
      }),
    );
  }

  await app.listen(config.port);
  logger.log(`[api] listening on http://localhost:${String(config.port)}/${config.globalPrefix}`);
}

void bootstrap();

