# Backend & Database Remediation — Residual Batch

**Date:** 2026-10-24  
**Repository HEAD:** `b63354f748bdee1c28cf79f8476f5bed97680810`  
**Audit baseline:** `docs/19_BACKEND_DATABASE_READINESS_AUDIT.md` (release `739f9eb`)  
**State:** working tree only. Nothing was committed, pushed, merged, deployed, or
closed remotely. Release decision remains **NO-GO**.

This report covers the residual batch after
`BACKEND-REMEDIATION-SUMMARY.md`. The L1–L4 reports are historical snapshots and
keep their original counts; this file is the current status for the residual
items and the latest verification.

## Status

| Item | Status | Evidence / remaining work |
| --- | --- | --- |
| `API-001` | **CLOSED** | Admin reject now looks up the submission first; unknown id → 404, reviewed → 409. HTTP regression in `payments.http.spec.ts`. |
| `API-002` | **CLOSED** | `mediaId` added to `UuidParamPipe`; malformed value → controlled 404. Unit test `test/uuid-param.spec.ts`. |
| `API-003` | **CLOSED in code; race not load-tested** | `request-media.service.ts` locks the `service_requests` row (`FOR UPDATE`) before count + create. No deterministic concurrent-confirm test yet. |
| `SEC-002` | **PARTIALLY CLOSED** | Invalid/rejected proofs are deleted; failed confirm transactions delete the uncommitted object. Presigned PUT is still size-unbounded, issuance is not rate-limited, and bucket lifecycle is not configured. |
| `PAY-007` | **CLOSED** | Audit writes remain in-transaction; proof rejection/transaction-failure cleanup is now implemented and unit-tested. |
| `DB-005` | **PARTIALLY MITIGATED** | `PrismaService.onModuleInit` rejects non-UTC/Etc/UTC sessions. Business columns remain naive `TIMESTAMP(3)`; no `timestamptz` migration. |
| `DB-007` | **CLOSED** | `docs/14_PRODUCTION_DEPLOY_RUNBOOK.md` now records 27 migrations and includes `20261022180000_status_timestamp_invariants`. |
| `DB-010` | **DEFERRED — P3 hygiene** | Historical non-idempotent FK-swap migration and duplicate helper are unchanged. Current scale does not make this a release blocker. |
| `DB-011` | **CLOSED** | Migration `20261022180000_status_timestamp_invariants` adds the status/timestamp CHECK; Admin override writes matching accepted/started/completed/cancelled stamps. |
| `REL-003` | **CLOSED in code** | `app.useLogger(new NestStructuredLogger())`; one JSON object per line for Nest logs. Unit test `test/structured-logger.spec.ts`. |
| `TEST-003` | **PARTIALLY CLOSED** | `typecheck:test` now covers HTTP E2E and selected new specs. Legacy fake-Prisma specs remain outside the typecheck program. |
| `TEST-004` | **CLOSED** | `configure-app.ts` is shared by `main.ts` and the HTTP harness; trust-proxy behavior is asserted in `security.http.spec.ts`; unit test `configure-app.spec.ts`. |
| `AUTH-003` | **OPEN — product/API decision** | Registration/contact enumeration via distinct 409 is unchanged. |
| `AUTH-005` | **OPEN — external** | No durable outbox/retry; live delivery is #27. |
| `DB-001` | **OPEN — production evidence** | Local role contract passes; production role/ownership/RLS/timezone is still unverified. |
| `SEC-001` | **OPEN — production evidence** | Public ACL hardening passes locally; production grant parity is still unverified. |
| `REL-001` | **OPEN — platform config** | `/ready` exists; the platform probe is still not confirmed on `/ready`. |

Closed in earlier batches and not reopened: `AUTH-001/002/004/006`,
`SEC-003/004`, `REL-002`, `PAY-001`–`PAY-006`, `DB-002/003/004/006/008/009`,
`TEST-001/002`.

## Verification

Run against the disposable local database `khabir-residual-audit-db`:
PostgreSQL 16.4/PostGIS on port 5435, database/user `khabir_test`, marker
`khabir-test`, **27 migrations applied**. No production or shared database was
accessed. The local role is `khabir_test` (superuser/owner/BYPASSRLS), so this
proves contract mechanics, not the production role.

| Check | Result |
| --- | --- |
| `pnpm --filter @khabir/api typecheck` | pass |
| `pnpm --filter @khabir/api typecheck:test` | pass |
| `pnpm --filter @khabir/api test` | **54 files / 455 tests passed** |
| `pnpm --filter @khabir/api test:http-e2e` | **6 files / 42 tests passed** |
| `pnpm --filter @khabir/api lint` | 0 errors; warnings only |
| `prisma migrate status` | 27 migrations; database up to date |
| `db:check-runtime-role` | pass locally (owner/BYPASSRLS, DML, UTC) |
| `release:check-rollback-target 94bdfcb` | refused (expected) |
| `release:check-rollback-target c903e06` | accepted |
| `git diff --check` | exit 0 |
| Generated `.js` under `apps/api/src` / `apps/api/test` | 0 |

The full and HTTP suites were re-run after deleting generated `.js` artifacts so
Vitest resolved the TypeScript sources. Local evidence:

- `.qa/residual-full-suite-ts.log` — 54/455, 2026-10-24 22:03–22:05
- `.qa/residual-http-e2e-ts.log` — 42/42, 2026-10-24 22:05

The full-suite count includes concurrently added worktree tests. It is a
current-tree count, not the release-only count and not CI evidence.

## What changed

- `apps/api/src/subscriptions/payments.service.ts` — distinguish unknown reject
  target (404) from already-reviewed (409).
- `apps/api/src/common/uuid-param.pipe.ts` — validate `mediaId`.
- `apps/api/src/service-requests/request-media.service.ts` — serialize confirms
  with a row lock before enforcing the media cap.
- `apps/api/src/bootstrap/configure-app.ts` — shared prefix, cookie parser,
  trust proxy, CORS, and exception filter.
- `apps/api/src/main.ts` — use `configureApp` and the structured Nest logger.
- `apps/api/test/http-e2e/harness.ts` — use the same bootstrap function.
- `apps/api/tsconfig.test.json`, `apps/api/package.json` — partial test
  typecheck (`typecheck:test`).
- `apps/api/src/subscriptions/proof.service.ts` — delete rejected objects and
  clean up on transaction failure.
- `apps/api/src/database/prisma.service.ts` — reject non-UTC DB sessions.
- `apps/api/prisma/migrations/20261022180000_status_timestamp_invariants/` —
  status/timestamp CHECK.
- `apps/api/src/admin/admin-operations.service.ts` — write matching lifecycle
  timestamps on Admin override.
- `apps/api/src/common/structured-logger.ts` — `NestStructuredLogger`.
- `apps/api/test/uuid-param.spec.ts`, `structured-logger.spec.ts`,
  `configure-app.spec.ts`, proof/media spec updates — regression coverage.
- `docs/14_PRODUCTION_DEPLOY_RUNBOOK.md` — migration chain and count updated to
  27.

## Remaining work

### Product / engineering decisions

1. `AUTH-003`: choose uniform registration/contact conflict responses, or
   accept enumeration explicitly.
2. `SEC-002`: sign `Content-Length` or use a POST policy with
   `content-length-range`; add issuance throttling; configure S3 lifecycle.
3. `DB-005`: decide whether to migrate business timestamps to `timestamptz`;
   the UTC runtime guard is mitigation, not normalization.
4. `TEST-003`: bring legacy fake-Prisma specs into a passing typecheck, or
   explicitly exclude and document them.
5. `DB-010`: decide whether the historical FK-swap hygiene is acceptable.

### Production gates (not closable by local tests)

1. Run `db:check-runtime-role` on the production database; record
   owner/BYPASSRLS/DML/UTC (#24).
2. Verify zero `anon`/`authenticated` table grants in production (#24).
3. Complete backup/PITR/restore drill and record RPO/RTO (#24).
4. Confirm hosting, budget, secrets, and platform probe wiring to `/ready`
   (#25).
5. Legal/privacy/controller and consent persistence (#26).
6. Live password-reset delivery and mailbox/provider (#27); `AUTH-005` remains
   out of production scope.
7. Exact-SHA deployment provenance and rollback rehearsal (#28).
8. Owner approval of PR #17; PR #19 remains unmerged.
9. Native Android/iOS runtime remains **NOT VERIFIED**.

## Risks

- These changes are uncommitted and have not run in CI. Do not treat this report
  as release evidence.
- The local superuser role does not prove the least-privilege production role.
- No production backup, ACL, email, hosting, DNS, or deployment evidence was
  inspected.
- The media-cap fix has no dedicated concurrent regression test.
- `SEC-002` still permits a client to upload an object larger than the intended
  business limit before confirm rejects it.

## Decision

**NO-GO remains.** The residual code materially reduces database, upload, API,
logging, and bootstrap risk, but production approval is still blocked by the
external gates above and by the remaining product/engineering decisions.
Do not declare GO, close Issues, merge PR #17, or deploy production from this
working tree.
