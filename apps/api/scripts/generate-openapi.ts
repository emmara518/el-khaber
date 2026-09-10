/**
 * OpenAPI document generator (ADR-0003, Task 10C).
 *
 * Boots the real NestJS application (no listening socket, no database
 * access — Prisma starts in degraded mode and is never queried) and
 * derives the document from the ACTUAL controllers. Endpoint paths and
 * methods are discovered from the running app; request schemas come
 * from the same zod schemas the validation pipe enforces; response
 * schemas reference the shared contract components.
 *
 * Output: docs/api/openapi.yaml — a generated, deterministic artifact.
 * NEVER hand-edit it; regenerate via `pnpm gen:openapi`.
 *
 * Run: pnpm gen:openapi   (from the repository root)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Deterministic placeholder environment for document generation only.
// The database is never contacted; Prisma starts in degraded mode.
// NOTE: these are set before the dynamic imports below on purpose —
// dynamic imports are NOT hoisted, unlike static ones.
process.env['NODE_ENV'] = process.env['NODE_ENV'] ?? 'development';
process.env['PORT'] = process.env['PORT'] ?? '3000';
process.env['API_GLOBAL_PREFIX'] = process.env['API_GLOBAL_PREFIX'] ?? 'api/v1';
process.env['CORS_ORIGINS'] = process.env['CORS_ORIGINS'] ?? '';
process.env['DATABASE_URL'] = process.env['DATABASE_URL'] ?? 'postgresql://placeholder/placeholder';
process.env['DIRECT_URL'] = process.env['DIRECT_URL'] ?? 'postgresql://placeholder/placeholder';
process.env['JWT_ACCESS_SECRET'] =
  process.env['JWT_ACCESS_SECRET'] ?? 'openapi-generation-placeholder-secret';
  process.env['ADMIN_JWT_ACCESS_SECRET'] =
    process.env['ADMIN_JWT_ACCESS_SECRET'] ?? 'openapi-generation-placeholder-admin-secret';

// apps/api/scripts → apps/api → apps → repo root
const REPO_ROOT = join(__dirname, '..', '..', '..');
const OUTPUT_PATH = join(REPO_ROOT, 'docs', 'api', 'openapi.yaml');

async function main(): Promise<void> {
  const [{ NestFactory }, { SwaggerModule }, { dump: dumpYaml }, { AppModule }, { getConfig }, { CONTRACT_SCHEMAS }] =
    await Promise.all([
      import('@nestjs/core'),
      import('@nestjs/swagger'),
      import('js-yaml'),
      import('../src/app.module'),
      import('../src/config/app.config'),
      import('../src/common/openapi/contract-schemas'),
    ]);

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(getConfig().globalPrefix);

  const document = SwaggerModule.createDocument(app, {
    openapi: '3.0.3',
    info: {
      title: 'Al-Khabir API',
      version: '0.1.0',
      description:
        'Al-Khabir backend contract. Generated from the NestJS controllers ' +
        '(ADR-0003). The canonical success envelope is `{ data, meta? }`; ' +
        'errors use `{ error: { code, message, fields? } }` with the codes ' +
        'documented in docs/07_API.md §21.',
    },
    components: {
      securitySchemes: {
        bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: CONTRACT_SCHEMAS,
    },
  });

  await app.close();

  const yaml = dumpYaml(document, {
    sortKeys: true,
    lineWidth: 120,
    noRefs: true,
  });

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, yaml, 'utf8');
  console.log(`[gen:openapi] wrote ${OUTPUT_PATH} (${String(yaml.length)} bytes)`);
}

main().catch((error: unknown) => {
  console.error('[gen:openapi] failed', error);
  if (error instanceof Error) {
    console.error('[gen:openapi] stack:', error.stack);
  }
  process.exitCode = 1;
});
