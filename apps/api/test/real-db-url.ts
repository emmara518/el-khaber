/**
 * Shared helper for the "real khabir-dev" database integration specs.
 *
 * These specs run against the shared managed Supabase connection, whose
 * session mode caps concurrent clients (pool_size). Prisma's default pool
 * per client (≈ 2×CPU cores + 1) exhausts that cap when vitest runs several
 * integration spec files in parallel, surfacing as
 * `FATAL: (EMAXCONNSESSION) max clients reached in session mode`.
 *
 * This bounds each TEST client's pool. It is a pure string transform: it does
 * NOT read or mutate process.env, so it cannot leak across worker-shared spec
 * files, and it never affects the application's own runtime configuration.
 */
export function withTestPoolLimit(rawUrl: string): string {
  if (rawUrl === '' || /[?&]connection_limit=/.test(rawUrl)) {
    return rawUrl;
  }
  const separator = rawUrl.includes('?') ? '&' : '?';
  return `${rawUrl}${separator}connection_limit=2&pool_timeout=20`;
}
