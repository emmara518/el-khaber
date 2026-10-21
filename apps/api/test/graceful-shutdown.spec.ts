/**
 * Real-subprocess graceful shutdown verification.
 *
 * Boots the compiled API (`dist/main.js`) as a child process against the
 * isolated disposable `khabir_test` database, waits for HTTP readiness,
 * sends a real termination signal, and verifies that:
 *   - the process exits cleanly (0 or the delivered signal),
 *   - the Prisma lifecycle hook ran and logged `prisma_disconnect`,
 *   - the listening port is closed after exit.
 *
 * Windows does not deliver POSIX signals to child processes (Node maps
 * `child.kill('SIGTERM')` to an unconditional TerminateProcess). There the
 * test uses a preload that emits the same process event Nest listens on,
 * so the shutdown hooks, Prisma disconnect, and port closure are still
 * exercised in a real child process. Linux CI always uses real signals.
 * The test never touches any database other than guarded `khabir_test`.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { connect } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { assertTestDatabaseIdentity, resolveTestDatabaseUrl } from './http-e2e/env';
import { readTestDatabaseUrl } from './real-db-url';

const here = dirname(fileURLToPath(import.meta.url));
const apiDir = resolve(here, '..');
const mainEntry = join(apiDir, 'dist', 'main.js');

const testUrl = readTestDatabaseUrl();
const isWindows = process.platform === 'win32';
const canRun = testUrl !== '' && existsSync(mainEntry);

if (process.env['CI'] === 'true' && testUrl === '') {
  throw new Error('CI requires TEST_DATABASE_URL for the graceful-shutdown subprocess test.');
}

let identityPrisma: PrismaClient | undefined;

beforeAll(async () => {
  if (!canRun) return;
  const target = resolveTestDatabaseUrl();
  expect(target.database).toBe('khabir_test');
  identityPrisma = new PrismaClient({ datasources: { db: { url: testUrl } } });
  await identityPrisma.$connect();

  // Name check first: never write the marker before proving the target.
  const rows = await identityPrisma.$queryRawUnsafe<Array<{ current_database: string }>>(
    'SELECT current_database()',
  );
  expect(rows[0]?.current_database).toBe('khabir_test');

  // CI migrates the disposable database directly and does not run the
  // provisioning script, so create the canonical safety marker idempotently
  // before asserting it. This only ever touches the guarded khabir_test DB.
  await identityPrisma.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS test_environment_marker (token text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now())',
  );
  await identityPrisma.$executeRawUnsafe(
    "INSERT INTO test_environment_marker (token) VALUES ('khabir-test') ON CONFLICT (token) DO NOTHING",
  );
  await assertTestDatabaseIdentity(identityPrisma as never);
});

afterAll(async () => {
  await identityPrisma?.$disconnect();
});

function getFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = http.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      server.close(() => {
        if (port === 0) {
          reject(new Error('Could not allocate a free TCP port'));
          return;
        }
        resolvePort(port);
      });
    });
  });
}

function requestStatus(url: string): Promise<number> {
  return new Promise((resolveStatus, reject) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolveStatus(response.statusCode ?? 0);
    });
    request.setTimeout(1_000, () => {
      request.destroy(new Error(`Timeout requesting ${url}`));
    });
    request.once('error', reject);
  });
}

async function waitForReady(url: string, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const status = await requestStatus(url);
      if (status === 200) return;
      lastError = new Error(`HTTP ${String(status)} from ${url}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(
    `API did not become ready at ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

function waitForExit(
  child: ChildProcess,
  timeoutMs = 15_000,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolveExit, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('API did not exit after shutdown signal'));
    }, timeoutMs);
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      resolveExit({ code, signal });
    });
  });
}

function canConnect(port: number): Promise<boolean> {
  return new Promise((resolveConnection) => {
    const socket = connect({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolveConnection(true);
    });
    socket.once('error', () => {
      resolveConnection(false);
    });
    socket.setTimeout(500, () => {
      socket.destroy();
      resolveConnection(false);
    });
  });
}

async function expectPortClosed(port: number): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!(await canConnect(port))) return;
    await delay(100);
  }
  throw new Error(`Port ${String(port)} is still accepting connections after shutdown`);
}

async function runShutdownScenario(signal: 'SIGTERM' | 'SIGINT'): Promise<void> {
  const port = await getFreePort();
  const trigger = join(here, 'shutdown-trigger.cjs');
  const child = spawn(
    process.execPath,
    isWindows ? ['--require', trigger, mainEntry] : [mainEntry],
    {
      cwd: apiDir,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: testUrl,
        DIRECT_URL: testUrl,
        PORT: String(port),
        API_GLOBAL_PREFIX: 'api/v1',
        CORS_ORIGINS: '',
        JWT_ACCESS_SECRET: 'test-access-secret-test-access-secret-32',
        JWT_ACCESS_TTL: '900',
        JWT_REFRESH_TTL: '2592000',
        JWT_ISSUER: 'khabir-api',
        JWT_AUDIENCE: 'khabir',
        ADMIN_JWT_ACCESS_SECRET: 'test-admin-secret-test-admin-secret-32',
        ADMIN_JWT_ISSUER: 'khabir-admin-api',
        ADMIN_JWT_AUDIENCE: 'khabir-admin',
        RATE_LIMIT_TTL: '60',
        RATE_LIMIT_MAX: '100000',
        AUTH_RATE_LIMIT_MAX: '100000',
        AUTH_MAX_FAILED_LOGINS: '5',
        AUTH_FAILURE_LOCK_SECONDS: '900',
      },
      stdio: [isWindows ? 'pipe' : 'ignore', 'pipe', 'pipe'],
    },
  );

  let stdout = '';
  let stderr = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  try {
    await waitForReady(`http://127.0.0.1:${String(port)}/api/v1/ready`);

    if (isWindows) {
      expect(child.stdin).not.toBeNull();
      child.stdin?.write(`${signal}\n`);
    } else {
      const sent = child.kill(signal);
      expect(sent).toBe(true);
    }

    const exit = await waitForExit(child);
    if (isWindows) {
      // Windows reports no POSIX wait status; Node's force-kill maps to
      // exit code 1. The lifecycle log and port closure below are the
      // meaningful assertions on this platform.
      expect(exit.signal !== null || exit.code === 0 || exit.code === 1).toBe(true);
    } else {
      expect(exit.signal === signal || exit.code === 0).toBe(true);
    }
    expect(stdout).toContain('prisma_disconnect');
    await expectPortClosed(port);
  } catch (error) {
    child.kill('SIGKILL');
    const details = `${error instanceof Error ? error.message : String(error)}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`;
    throw new Error(details);
  }
}

describe('graceful API shutdown (real subprocess)', () => {
  it.skipIf(!canRun)(
    'SIGTERM closes the port, disconnects Prisma, and exits',
    async () => {
      await runShutdownScenario('SIGTERM');
    },
    30_000,
  );

  it.skipIf(!canRun)(
    'SIGINT closes the port, disconnects Prisma, and exits',
    async () => {
      await runShutdownScenario('SIGINT');
    },
    30_000,
  );
});
