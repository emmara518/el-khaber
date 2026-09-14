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

  // Topology notice (Task REM-004): rate limiting and failed-login lockout
  // are PROCESS-LOCAL (in-memory). They are only safe when the API runs as a
  // single instance. This does not resolve the topology (a CTO decision) but
  // makes the constraint impossible to miss in production logs.
  if (config.env === 'production') {
    logger.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'warn',
        event: 'topology-notice',
        message:
          'Rate limiting and failed-login lockout are in-memory (process-local). Run a SINGLE API instance, or provide a CTO-approved shared store, before scaling horizontally.',
      }),
    );
  }

  await app.listen(config.port);
  logger.log(`[api] listening on http://localhost:${String(config.port)}/${config.globalPrefix}`);
}

void bootstrap();

