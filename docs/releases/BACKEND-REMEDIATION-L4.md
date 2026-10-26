# Backend Remediation — L4 Data Integrity, Performance & Test Depth

**Date:** 2026-10-24  
**Repository HEAD:** `b63354f748bdee1c28cf79f8476f5bed97680810`  
**State:** working-tree changes only; no commit/push/deploy.

## Scope and result

| Finding | Result | Evidence |
| --- | --- | --- |
| `DB-002` cross-category service/fault | **CLOSED** | Composite unique + FKs; app filter; real-HTTP 404 test |
| `DB-003` product delete erases chat | **CLOSED** | Delete blocked with 409 when conversations exist; real-HTTP test |
| `DB-004` initiator FK/NULL hole | **CLOSED** | FK + `product_id IS NULL OR initiator_user_id IS NOT NULL` check |
| `DB-005` naive timestamps | **PARTIALLY MITIGATED** | Preflight requires UTC/Etc/UTC session; columns remain `TIMESTAMP(3)` |
| `DB-006` rate-limit retention | **CLOSED** | Hourly unref'ed prune + `window_start` index |
| `DB-007` stale deploy runbook | **CLOSED** | 26-migration chain and historical production warning |
| `DB-008` money/coordinate checks | **CLOSED** | DB CHECKs for non-negative/ordered money and coordinate pairs/ranges |
| `DB-009` query indexes | **CLOSED** | Composite list/order indexes added |
| `DB-011` status timestamp invariants | **PARTIALLY CLOSED** | Admin override now writes accepted/started timestamps; no DB CHECK |
| `REL-003` structured logs | **PARTIALLY CLOSED** | Logger preserves fields; Nest default prefixes remain in some paths |
| `TEST-001` fake-only auth coverage | **CLOSED** | Real-HTTP auth remediation suite 5 tests |
| `TEST-002` host-only test DB guard | **CLOSED** | `khabir_test` database-name check + rejection test |
| `TEST-003` tests excluded from typecheck | **OPEN** | `apps/api/tsconfig.json` still excludes tests |
| `TEST-004` harness bootstrap parity | **OPEN** | HTTP harness still does not apply `main.ts` middleware |
| `SEC-002` presigned size/orphans | **OPEN** | No `Content-Length` signing / lifecycle cleanup |
| P3 API-001/002/003 | **OPEN** | Reject 409/404, malformed mediaId, media cap race |

## Implementation

- `service_requests` has composite FKs to `services(id, category)` and
  `faults(id, category)`; app lookups include the category.
- Product deletion checks `conversation.count` for the merchant-owned product
  and returns 409 instead of cascading chat history.
- Conversation initiator has a real FK and a product-scope check.
- Rate-limit buckets prune hourly (unref'ed) and have a `window_start` index.
- Money/coordinate constraints are enforced in PostgreSQL:
  - non-negative prices/final price/estimated range/order;
  - coordinate pair and lat/lng ranges.
- Added composite indexes for request lists, reviews, notifications, audit logs.
- Admin status overrides now set `acceptedAt`/`startedAt` alongside status.
- `StructuredLogger` preserves arbitrary detail/status/code fields in JSON;
  a unit test asserts one parseable line.
- Test DB resolver now rejects any database name other than `khabir_test`.
- The deploy runbook now states 26 repository migrations and explicitly warns
  that historical production counts are not current evidence.

## Files

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20261022130000_service_fault_category_integrity/migration.sql`
- `apps/api/prisma/migrations/20261022140000_conversation_initiator_integrity/migration.sql`
- `apps/api/prisma/migrations/20261022150000_rate_limit_prune_index/migration.sql`
- `apps/api/prisma/migrations/20261022160000_money_coordinate_checks/migration.sql`
- `apps/api/prisma/migrations/20261022170000_query_indexes/migration.sql`
- `apps/api/src/service-requests/service-requests.service.ts`
- `apps/api/src/merchant/products.service.ts`
- `apps/api/src/common/rate-limit/rate-limit.service.ts`
- `apps/api/src/admin/admin-operations.service.ts`
- `apps/api/src/common/structured-logger.ts`
- `apps/api/test/structured-logger.spec.ts`
- `apps/api/test/real-db-url.ts`
- `apps/api/test/real-db-url.spec.ts`
- `apps/api/test/http-e2e/security.http.spec.ts`
- `docs/14_PRODUCTION_DEPLOY_RUNBOOK.md`

## Verification

| Command | Result |
| --- | --- |
| full API suite | 52 files / 451 tests pass |
| HTTP E2E | 5 files / 37 tests pass |
| migration status | 26 migrations, up to date |
| typecheck / lint | pass / 0 errors |
| `git diff --check` | exit 0 |
| new real-HTTP data-integrity tests | cross-category 404; product delete 409 and conversation retained |

## Remaining L4 / related work

- `DB-005`: business timestamps are still `TIMESTAMP(3)`. The runtime preflight
  requires UTC/Etc/UTC, which preserves current behavior, but a future
  `timestamptz` migration is still the structural fix.
- `DB-011`: no DB-level CHECK ties each status to its timestamp column.
- `REL-003`: some Nest bootstrap/HTTP logs still use the default Logger prefix;
  a global `app.useLogger` and bootstrap-log audit remain.
- `TEST-003`: tests are not included in the API typecheck program.
- `TEST-004`: the HTTP harness does not apply cookie-parser/CORS/trust-proxy/
  shutdown bootstrap from `main.ts`.
- `SEC-002`: presigned upload size/orphan controls remain open.
- P3 API-001/002/003 remain open.
- No load/capacity test was run; no production performance claim is made.
