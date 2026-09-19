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

  // Topology guard (OPTION A — single-instance production, docs/11 §7.2):
  // rate limiting and failed-login lockout are PROCESS-LOCAL (in-memory).
  // Booting with MULTI_INSTANCE=true and no CTO-approved shared store is a
  // misconfiguration: log FATAL and refuse to start (fail-closed against
  // accidental scale-out). Default (unset/false) boots normally as a single
  // instance. No Redis client, no new dependencies — REPLICAS=1 is enforced
  // by deployment configuration, this guard only closes the explicit
  // opt-in to multi-instance.
  const multiInstance = (process.env['MULTI_INSTANCE'] ?? '').trim().toLowerCase() === 'true';
  const sharedStore = (process.env['SHARED_STORE_URL'] ?? '').trim();
  if (multiInstance && sharedStore.length === 0) {
    logger.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'fatal',
        event: 'topology-fatal',
        message:
          'MULTI_INSTANCE=true requires a CTO-approved shared store (SHARED_STORE_URL). ' +
          'Rate limiting and failed-login lockout are in-memory; refusing to boot rather than run unsafe.',
      }),
    );
    process.exit(1);
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  app.setGlobalPrefix(config.globalPrefix);
  app.use(cookieParser());

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
    }),
  );

  // Topology notice (OPTION A — single-instance production, docs/11 §7.2):
  // rate limiting and failed-login lockout are PROCESS-LOCAL (in-memory).
  // Production MUST run a SINGLE API instance (REPLICAS=1) until the CTO
  // approves a shared store. The MULTI_INSTANCE guard above fails closed
  // against accidental scale-out; this notice keeps the constraint visible
  // in production logs on every boot.
  if (config.env === 'production') {
    logger.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'warn',
        event: 'topology-notice',
        topology: 'single-instance',
        replicas: (process.env['REPLICAS'] ?? '1').trim(),
        multiInstance,
        message:
          'Rate limiting and failed-login lockout are in-memory (process-local). Run a SINGLE API instance (REPLICAS=1), or provide a CTO-approved shared store (SHARED_STORE_URL) before scaling horizontally.',
      }),
    );
  }

  await app.listen(config.port);
  logger.log(`[api] listening on http://localhost:${String(config.port)}/${config.globalPrefix}`);
}

void bootstrap();

