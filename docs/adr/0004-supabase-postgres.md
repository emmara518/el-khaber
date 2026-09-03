# ADR-0004: Supabase as the managed PostgreSQL platform

- **Status:** Accepted
- **Date:** 2026-09-03
- **Deciders:** CTO / Technical Lead

## Context

The Al-Khabir platform requires a PostgreSQL 15+ database with the
PostGIS extension (for technician geospatial queries per
`docs/06_DATABASE.md` and `docs/05_TECH_ARCHITECTURE.md` §3). The
earlier Task #002 amendment required a *native local* PostgreSQL
install. That model carries real friction for the development team:

- One-time OS-specific install per developer machine.
- Local service management (launch, stop, version upgrades).
- Backup/restore discipline owned by each developer.
- Drift between local and production Postgres versions.

The CTO has selected **Supabase** as the managed PostgreSQL
provider. The application architecture (NestJS → Prisma → Postgres)
does not change. Supabase is approved for:

- managed PostgreSQL
- PostGIS extension
- database dashboard
- SQL editor
- database backups/recovery
- (future) optional platform services — *only when explicitly
  approved per service*.

Supabase Auth, Supabase Storage, Supabase Realtime, and Supabase
Edge Functions are **out of scope** for this task and for the MVP.
Each remains a separate CTO decision.

## Decision

The application connects to a Supabase-managed PostgreSQL database
through Prisma. Two connection strings are used, both sourced from
the Supabase dashboard and never hard-coded:

- `DATABASE_URL` — pooled connection (Transaction or Session
  pooler). Used by the NestJS runtime. Pooling is required because
  Supabase terminates idle connections aggressively on the direct
  endpoint, and the platform orchestrator may run multiple API
  replicas.
- `DIRECT_URL` — direct (non-pooled) connection. Used by
  `prisma migrate dev` and `prisma migrate deploy`. The pooler does
  not support DDL or the advisory locks Prisma uses for migration
  sequencing, so migrations must run against a direct connection.

### Why Supabase

- **No local database installation** required for any developer.
  Removes the per-machine setup step.
- **No Docker / Docker Compose** for the database. The previous
  local-Docker model was removed by the same amendment.
- **Managed PostgreSQL** with the exact version (15+) and extensions
  the platform needs.
- **PostGIS** is a first-class Supabase extension. Enabled per
  project via the dashboard SQL editor or the
  `CREATE EXTENSION postgis;` migration.
- **Prisma compatibility** — Supabase Postgres is wire-compatible
  with the standard Prisma PostgreSQL provider. No driver change is
  required.
- **Dashboard + SQL editor** for ad-hoc inspection during development
  and operations.
- **Backups / point-in-time recovery** managed by Supabase per the
  selected plan.

### Architecture rule (authoritative)

The architecture remains exactly:

```
Expo React Native
Next.js Admin
Next.js Landing
        ↓
NestJS API
        ↓
Prisma
        ↓
Supabase PostgreSQL / PostGIS
```

- **NestJS remains the application / business / security authority.**
  No business logic is moved into Supabase Edge Functions, into
  Supabase Auth, or into database triggers that duplicate the
  NestJS policy.
- **The mobile app never connects directly to Supabase.** It talks
  only to the NestJS API. Database credentials, service-role keys,
  and the Supabase URL are never exposed to the client bundle.
- **No Row Level Security policies are added in this task.** RLS
  would be a deliberate, ADR-backed decision and must not duplicate
  or conflict with the NestJS policy module (`can` / `authorize` in
  `apps/api/src/common/policy/can.ts`).
- **Authorization source of truth:** NestJS policy + role + ownership
  + subscription entitlement. Supabase dashboard permissions are
  never relied upon as a substitute for application authorization.

### Custom Prisma database user

Where the Supabase plan allows it, a **dedicated database user for
Prisma** is created (rather than using the Supabase dashboard owner
credentials). The Prisma user has the minimum privileges required
to run migrations and the application's read/write workload. The
credentials are stored only in environment variables, never in
source, and never logged.

### Migration workflow

- Development: `pnpm --filter @khabir/api prisma:migrate:dev`
  (connects via `DIRECT_URL`).
- Staging / production: `pnpm --filter @khabir/api prisma:migrate:deploy`
  (connects via `DIRECT_URL`).
- Application runtime: connects via `DATABASE_URL` (pooled).
- `prisma db push` is **not** used as a schema workflow.
- Migration files remain in `apps/api/prisma/migrations/`.

### Environment separation

Explicit environment-variable sets for **development**, **staging**,
and **production**:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_ACCESS_SECRET`
- `ADMIN_JWT_ACCESS_SECRET`
- (other server secrets, unchanged)

`DATABASE_URL` and server secrets are never placed in Expo public
environment variables (`EXPO_PUBLIC_*`).

## Consequences

- The local PostgreSQL install section in `docs/local-dev.md` is
  removed and replaced with Supabase dashboard instructions.
- The `.env.example` documents the Supabase connection variables.
- The Prisma schema's `datasource db` declares both `url` and
  `directUrl` so Prisma's tooling can pick the right one per
  command.
- The e2e test suite must point at an **isolated Supabase test
  project / test database** before it can be exercised against real
  persistence. Production data must never be used as a test target.
  Until that isolated test database is available, the e2e suite
  continues to run against the in-memory `FakePrismaClient`
  (clearly labelled test-only).
- If a Supabase project is not yet provisioned for the development
  machine, the developer follows the steps in `docs/local-dev.md`
  to create one, enable PostGIS, create the Prisma user, copy the
  connection strings into `apps/api/.env`, and run
  `prisma migrate deploy`.

## References

- `docs/05_TECH_ARCHITECTURE.md` §3, §5, §6, §16
- `docs/06_DATABASE.md` §24, §26
- `docs/07_API.md` §23
- `docs/10_ENGINEERING_RULES.md` §15, §19, §24
- ADR-0001 (locked stack) — the application stack is unchanged.
- ADR-0002 (monorepo layout) — the monorepo is unchanged.
- ADR-0003 (API source of truth) — Prisma is the persistence
  implementation, NestJS is the application authority.
