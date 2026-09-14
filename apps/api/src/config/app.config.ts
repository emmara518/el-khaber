/**
 * Centralized configuration. Reads environment variables once and exposes
 * a strongly-typed config object. Throws on startup if required values are
 * missing or malformed — fail-fast principle per docs/05_TECH_ARCHITECTURE.md §18.
 *
 * No secret values may be hard-coded. All secrets are sourced from the
 * process environment per docs/10_ENGINEERING_RULES.md §19, §24.
 */

function requireString(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function readString(name: string, fallback: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  return value.trim();
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) {
    throw new Error(`Invalid number for ${name}: ${raw}`);
  }
  return n;
}

function readList(name: string): string[] {
  return readString(name, '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export interface AppConfig {
  readonly env: 'development' | 'test' | 'production';
  readonly port: number;
  readonly globalPrefix: string;
  readonly corsOrigins: readonly string[];
  readonly databaseUrl: string;
  readonly directUrl: string;
  readonly auth: {
    readonly accessSecret: string;
    readonly accessTtlSeconds: number;
    readonly refreshTtlSeconds: number;
    readonly issuer: string;
    readonly audience: string;
  };
  readonly adminAuth: {
    readonly accessSecret: string;
    readonly accessTtlSeconds: number;
    readonly refreshTtlSeconds: number;
    readonly issuer: string;
    readonly audience: string;
  };
  readonly rateLimit: {
    readonly ttlSeconds: number;
    readonly max: number;
    readonly authMax: number;
  };
  readonly identity: {
    /** Failed logins per (identifier, ip) before a temporary lock. */
    readonly maxFailedLogins: number;
    /** Temporary lock duration in seconds; locks always auto-expire. */
    readonly failureLockSeconds: number;
  };
}

let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (cached) {
    return cached;
  }

  const env = (readString('NODE_ENV', 'development') as AppConfig['env']) ?? 'development';
  const accessSecret = requireString('JWT_ACCESS_SECRET');
  const adminAccessSecret = requireString('ADMIN_JWT_ACCESS_SECRET');
  if (accessSecret === adminAccessSecret) {
    throw new Error('JWT_ACCESS_SECRET and ADMIN_JWT_ACCESS_SECRET must differ');
  }

  cached = {
    env,
    port: readNumber('PORT', 3000),
    globalPrefix: readString('API_GLOBAL_PREFIX', 'api/v1'),
    corsOrigins: readList('CORS_ORIGINS'),
    databaseUrl: requireString('DATABASE_URL'),
    // Prisma requires DIRECT_URL for migrations/DDL even though the pooled
    // DATABASE_URL serves runtime traffic. Fail fast here instead of
    // surfacing a cryptic Prisma error later.
    directUrl: requireString('DIRECT_URL'),
    auth: {
      accessSecret,
      accessTtlSeconds: readNumber('JWT_ACCESS_TTL', 900),
      refreshTtlSeconds: readNumber('JWT_REFRESH_TTL', 60 * 60 * 24 * 30),
      issuer: readString('JWT_ISSUER', 'khabir-api'),
      audience: readString('JWT_AUDIENCE', 'khabir'),
    },
    adminAuth: {
      accessSecret: adminAccessSecret,
      accessTtlSeconds: readNumber('ADMIN_JWT_ACCESS_TTL', 900),
      refreshTtlSeconds: readNumber('ADMIN_JWT_REFRESH_TTL', 60 * 60 * 24 * 30),
      issuer: readString('ADMIN_JWT_ISSUER', 'khabir-admin-api'),
      audience: readString('ADMIN_JWT_AUDIENCE', 'khabir-admin'),
    },
    rateLimit: {
      ttlSeconds: readNumber('RATE_LIMIT_TTL', 60),
      max: readNumber('RATE_LIMIT_MAX', 20),
      authMax: readNumber('AUTH_RATE_LIMIT_MAX', 10),
    },
    identity: {
      // Provisional defaults pending CTO ratification (Task 10D §6):
      // no thresholds were documented anywhere.
      maxFailedLogins: readNumber('AUTH_MAX_FAILED_LOGINS', 5),
      failureLockSeconds: readNumber('AUTH_FAILURE_LOCK_SECONDS', 900),
    },
  };

  return cached;
}
