# Backend & Database Remediation — Unified Status

**Date:** 2026-10-24  
**Repository HEAD:** `b63354f748bdee1c28cf79f8476f5bed97680810`  
**Audit baseline:** `docs/19_BACKEND_DATABASE_READINESS_AUDIT.md` (release `739f9eb`)  
**Current report:** `docs/releases/BACKEND-REMEDIATION-RESIDUAL.md`  
**State:** remediation changes are in the working tree only. Nothing was
committed, pushed, merged, migrated remotely, or deployed. Release decision
remains **NO-GO**.

Batch reports are historical snapshots:

- `docs/releases/BACKEND-REMEDIATION-L1.md`
- `docs/releases/BACKEND-REMEDIATION-L2.md`
- `docs/releases/BACKEND-REMEDIATION-L3.md`
- `docs/releases/BACKEND-REMEDIATION-L4.md`
- `docs/releases/BACKEND-REMEDIATION-RESIDUAL.md` — current status and evidence

## Current status

| Item | Status | Summary |
| --- | --- | --- |
| `AUTH-001/002/004/006` | **CLOSED** | Email-change verification, separated lockout buckets, atomic reset claim, refresh-family revocation |
| `AUTH-003` | **OPEN — product/API decision** | Registration/contact enumeration via distinct 409 |
| `AUTH-005` | **OPEN — out of production scope** | No durable outbox; live delivery remains #27 |
| `SEC-001` | **CLOSED in code; production NOT VERIFIED** | Public client grants revoked locally |
| `SEC-002` | **PARTIALLY CLOSED** | Rejected/failed proof objects are deleted; presigned size, issuance throttle, lifecycle remain |
| `SEC-003/004` | **CLOSED** | No-store headers; explicit proof roles |
| `REL-001` | **PARTIALLY CLOSED** | `/ready` checks migrations/schema; platform probe wiring still unverified |
| `REL-002` | **CLOSED** | Strict `NODE_ENV`; placeholder secrets rejected |
| `REL-003` | **CLOSED in code** | Global `NestStructuredLogger`; one JSON object per line |
| `PAY-001`–`PAY-006` | **CLOSED** | Snapshots, retry identity, notification/chat races, grant/technician conflicts |
| `PAY-007` | **CLOSED** | Audit in transaction; proof rejection/transaction failure cleanup |
| `DB-001` | **PARTIALLY CLOSED — production NOT VERIFIED** | Role contract documented; preflight enforces owner/BYPASSRLS + UTC + DML locally |
| `DB-002/003/004` | **CLOSED** | Composite category FKs, product deletion guard, initiator FK |
| `DB-005` | **PARTIALLY MITIGATED** | UTC session guard; columns still naive `TIMESTAMP(3)` |
| `DB-006` | **CLOSED** | Hourly prune + index |
| `DB-007` | **CLOSED** | Runbook updated to 27 migrations |
| `DB-008/009` | **CLOSED** | Money/coordinate checks; query indexes |
| `DB-010` | **DEFERRED — P3 hygiene** | Historical non-idempotent FK swap and duplicate helper unchanged |
| `DB-011` | **CLOSED** | Status/timestamp CHECK + Admin override timestamps |
| `TEST-001/002` | **CLOSED** | Real-HTTP auth remediation suite; test DB name guard |
| `TEST-003` | **PARTIALLY CLOSED** | `typecheck:test` covers HTTP/new specs; legacy fake-Prisma specs excluded |
| `TEST-004` | **CLOSED** | Shared bootstrap parity + trust-proxy assertion |
| `API-001/002` | **CLOSED** | Reject unknown id → 404; malformed `mediaId` → 404 |
| `API-003` | **CLOSED in code** | Confirm-media row lock; no dedicated concurrent regression test |
| `OPS-001` | **CLOSED** | Rollback floor `c903e06`; old target refused |

## Verification baseline

All commands were run against the isolated local `khabir_test`
(PostgreSQL 16.4 / PostGIS, marker `khabir-test`, 27 migrations). No production
or shared database was accessed.

| Check | Result |
| --- | --- |
| `pnpm --filter @khabir/api typecheck` | pass |
| `pnpm --filter @khabir/api typecheck:test` | pass |
| `pnpm --filter @khabir/api test` | **54 files / 455 tests pass** |
| `pnpm --filter @khabir/api test:http-e2e` | **6 files / 42 tests pass** |
| `pnpm --filter @khabir/api lint` | 0 errors; warnings only |
| `prisma migrate status` | 27 migrations; database up to date |
| `db:check-runtime-role` | pass locally (owner/BYPASSRLS, DML, UTC) |
| `release:check-rollback-target 94bdfcb` | refused (expected) |
| `release:check-rollback-target c903e06` | accepted |
| `git diff --check` | exit 0 |

The full and HTTP suites were re-run after generated `.js` artifacts were
removed. This is a current-tree count, not release-only or CI evidence.

## Production gates still open

1. **Production DB role/ownership/RLS/timezone** — run
   `db:check-runtime-role` on the target (#24).
2. **Production ACL parity** — verify zero `anon`/`authenticated` grants (#24).
3. **Production backup/PITR/restore drill, RPO/RTO** (#24).
4. **Hosting/budget/secrets** and platform `/ready` probe wiring (#25).
5. **Legal/privacy/controller + consent persistence** (#26).
6. **Live password-reset delivery + mailbox/provider** (#27); AUTH-005 remains
   intentionally out of production scope.
7. **Exact-SHA deployment provenance + rollback rehearsal** (#28).
8. **Owner approval of PR #17**; PR #19 remains unmerged.
9. Native Android/iOS runtime remains **NOT VERIFIED**.

## Risks

- The remediation is **uncommitted and not CI-verified**. It must not be
  represented as a release artifact or deployed as-is.
- The local runtime role is `khabir_test` (superuser/owner). That proves the
  contract mechanics, not the production role.
- No production backup, ACL, email, hosting, or deployment evidence was
  inspected.
- `AUTH-003`, `AUTH-005`, `SEC-002`, `DB-001`, `DB-005`, `DB-010`, `REL-001`
  wiring, and `TEST-003` remain open or partial.

## Decision

**NO-GO remains.** The engineering risk is materially reduced, but production
approval is still blocked by external gates and the remaining items above.
Do not declare GO, close Issues, merge PR #17, or deploy production.
