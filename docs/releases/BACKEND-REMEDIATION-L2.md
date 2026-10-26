# Backend Remediation — L2 Database Role, ACL & Rollback Safety

**Date:** 2026-10-24  
**Repository HEAD:** `b63354f748bdee1c28cf79f8476f5bed97680810`  
**State:** working-tree changes only; no commit/push/deploy.

## Scope and result

| Finding | Result | Evidence |
| --- | --- | --- |
| `DB-001` RLS/runtime-role contract | **PARTIALLY CLOSED — production NOT VERIFIED** | Contract documented; `db:check-runtime-role` proves owner/BYPASSRLS and UTC locally |
| `SEC-001` retained public ACLs | **CLOSED in code/migration; production NOT VERIFIED** | New migration revokes all public table/sequence/function grants and default privileges |
| `OPS-001` unsafe rollback below `c903e06` | **CLOSED** | Rollback-floor script + runbook; old target refused, floor accepted |
| `REL-001` shallow readiness | **PARTIALLY CLOSED** | `/ready` now checks unfinished migrations + critical table access; platform probe still points at `/health` |
| `REL-002` permissive `NODE_ENV` / secrets | **CLOSED** | Strict enum, template-placeholder rejection in production; tests |

## Implementation

### DB-001 role contract

The no-policy RLS design is only valid when the runtime role is the table owner
(with `FORCE RLS` off) or has `BYPASSRLS`. `docs/local-dev.md` now says this
explicitly and grants a dedicated role `BYPASSRLS` plus DML/sequence access
(no ownership, no DDL).

New preflight:

```sh
pnpm --filter @khabir/api db:check-runtime-role
```

It prints only role/ownership/RLS/privilege flags (never the URL or password)
and fails if the runtime role would be blocked, lacks `SELECT/INSERT`, or the
session timezone is not UTC/Etc/UTC. Local isolated result:

```text
currentUser: khabir
usersOwner: khabir
ownsUsers: true
rolbypassrls: true
usersForceRls: false
canDml: true
sessionTimezone: Etc/UTC
accepted: true
```

Production role, ownership, and timezone remain **NOT VERIFIED**.

### SEC-001 public ACLs

`20261022110000_public_acl_hardening` revokes all privileges on all public
tables, sequences, and functions from `anon`/`authenticated`, and sets default
privileges for future objects. Local verification:

```text
information_schema.role_table_grants for anon/authenticated on public: 0
```

Production ACL parity remains **NOT VERIFIED** until `anon`/`authenticated`
grants are inspected on the target.

### OPS-001 rollback floor

New guard:

```sh
pnpm --filter @khabir/api release:check-rollback-target <ref>
```

- `94bdfcb` → **REFUSED** (predates the default-drop fix; auth routes would
  fail with PostgreSQL `23502`).
- `c903e06` → **ACCEPTED**.

The rollback runbook now states the floor and requires the check before
redeploying an API image. No defaults were restored and no schema was changed
for this fix.

### REL-001 readiness

`/ready` now:

- fails if `_prisma_migrations` has unfinished (and not rolled-back) rows;
- queries `users`, proving the runtime can read a critical migrated table;
- returns `checks: { database, migrations, schema }`.

`Dockerfile`/`render.yaml` still use `/health`; the platform probe must be
switched to `/ready` by the owner/DevOps. That external wiring is **NOT
VERIFIED**.

### REL-002 configuration

- `NODE_ENV` is a strict `development|test|production` enum; `prod` no longer
  bypasses production protections.
- Production rejects JWT secrets containing template placeholders
  (`replace-me`, `change-me`, `placeholder`).
- New `config.spec.ts` covers invalid environment, placeholder rejection, and
  valid production defaults.

## Files

- `apps/api/src/health/health.controller.ts`
- `apps/api/src/config/app.config.ts`
- `apps/api/src/auth/auth.module.ts` (HTTPS reset-delivery gate, shared with L1)
- `apps/api/prisma/migrations/20261022110000_public_acl_hardening/migration.sql`
- `apps/api/scripts/check-runtime-db-role.mjs`
- `apps/api/scripts/check-rollback-target.mjs`
- `apps/api/package.json`
- `apps/api/test/config.spec.ts`
- `apps/api/test/foundation.e2e.spec.ts`
- `apps/api/test/fake-prisma.ts`
- `docs/local-dev.md`
- `docs/14_PRODUCTION_DEPLOY_RUNBOOK.md`
- `docs/releases/DEPLOYMENT-PROVENANCE-AND-ROLLBACK.md`

## Verification

| Command | Result |
| --- | --- |
| `db:check-runtime-role` | pass locally (owner/BYPASSRLS, DML, UTC) |
| `release:check-rollback-target 94bdfcb` | refused (expected) |
| `release:check-rollback-target c903e06` | accepted |
| ACL grant count for `anon/authenticated` | 0 locally |
| `prisma migrate status` | 26 migrations, up to date |
| full API suite | 52 files / 451 tests pass |
| HTTP E2E | 5 files / 37 tests pass |
| typecheck / lint | pass / 0 errors |

## Remaining L2 work

- **Production DB role/ownership/timezone:** owner/DevOps must run the
  preflight against the actual production database.
- **Production ACL parity:** owner/DevOps must verify zero client grants.
- **Readiness probe wiring:** switch the platform probe to `/ready`.
- No production database was inspected or changed.
