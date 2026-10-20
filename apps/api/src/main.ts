import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { type NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { config as loadDotenv } from 'dotenv';

import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/api-exception.filter';
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

  // Topology compatibility notice (docs/11 §7.2, updated AUD-007):
  // Rate limiting and failed-login lockout are backed by the PostgreSQL
  // shared store (rate_limit_buckets / login attempt rows via Prisma) —
  // NOT in-memory anymore. MULTI_INSTANCE=true is therefore safe to boot
  // with any number of instances; SHARED_STORE_URL is treated as a legacy,
  // unused flag and only recorded here for log continuity.
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
          'MULTI_INSTANCE=true. Rate limiting and failed-login lockout use the PostgreSQL shared store, so horizontal scaling is safe. SHARED_STORE_URL is legacy/unused.',
      }),
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  app.setGlobalPrefix(config.globalPrefix);
  app.use(cookieParser());

  // AUD-007 (S-2): trust exactly config.trustProxyHops reverse-proxy hops
  // so req.ip resolves to the real client address instead of the proxy
  // edge IP. Numeric semantics (trust = i < hops): entries further left in
  // X-Forwarded-For stay UNTRUSTED — a client cannot spoof the resolved
  // address by padding the header, provided the last trusted proxy appends
  // its own observation (Render does: X-Forwarded-For ends with the
  // connecting client IP). Failure to set this makes every client share
  // the proxy IP and breaks the (identifier, ip) login-lockout keying.
  app.set('trust proxy', config.trustProxyHops);

  // CORS. Origins are explicitly configured via CORS_ORIGINS. No wildcards.
  // Credentials are allowed so httpOnly refresh cookies can be used by the
  // Admin and Landing surfaces in later tasks. The mobile app uses Bearer
  // tokens and does not need credentials.
  if (config.corsOrigins.length > 0) {
    app.enableCors({
      origin: (origin, callback) => {
        if (origin === undefined) {
          callback(null, true);
          return;
        }
        if (config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin '${origin}' not allowed`), false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });
  }

  // NestJS-decorated DTOs would use a global ValidationPipe, but the
  // API validates request payloads with zod via ZodValidationPipe per
  // route. The global pipe is intentionally omitted so the
  // `class-validator` package is not required.

  app.useGlobalFilters(new ApiExceptionFilter());

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

  // Multi-instance note (docs/11 §7.2): rate limiting and failed-login
  // lockout are PostgreSQL-backed (shared via the database), so scaling
  // horizontally is supported. This notice only keeps the topology fact
  // visible in production logs on every boot.
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
          'Rate limiting and failed-login lockout use the PostgreSQL shared store (Prisma). Multi-instance deployments are supported; SHARED_STORE_URL is legacy/unused.',
      }),
    );
  }

  await app.listen(config.port);
  logger.log(`[api] listening on http://localhost:${String(config.port)}/${config.globalPrefix}`);
}

void bootstrap();

