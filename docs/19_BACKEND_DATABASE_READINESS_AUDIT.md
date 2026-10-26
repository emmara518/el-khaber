# Backend & Database Production Readiness Audit

**Audit date:** 2026-10-22  
**Repository:** `D:\el-khaber` (`emmara518/el-khaber`)  
**Audited release:** `739f9ebc964d0415686f1827942d8b07a3f70c30`  
**Working tree HEAD:** `b63354f748bdee1c28cf79f8476f5bed97680810` (docs-only commits after the release)  
**API/schema diff from release to HEAD:** none  
**Verdict:** **PARTIALLY VERIFIED — NOT READY FOR PRODUCTION**  
**Remediation status:** see `docs/releases/BACKEND-REMEDIATION-SUMMARY.md`

---

## Scope, safety, and evidence levels

This is an audit only. No application source, schema, migration, API contract, dependency, secret, cloud resource, or deployment was changed. No issue was closed. No production or shared database was contacted.

The worktree was not clean during the audit: it contained unrelated UI changes and an untracked API test, `apps/api/test/admin-payments-decisions.e2e.spec.ts`. Those changes were preserved and are **not** part of the audited release. The release-only test run explicitly excludes that untracked test.

Evidence labels used below:

- **VERIFIED** — deterministic code/schema path, or reproduced against the isolated local database.
- **CODE-REVIEW ONLY** — implementation is clear, but behavior depends on configuration, concurrency, or an unavailable provider.
- **INFERRED** — plausible race or failure mode derived from transaction/isolation semantics; not executed.
- **NOT VERIFIED** — requires production access, provider credentials, or an environment decision that was not available.

Local database safety proof used before every DB-backed run:

```text
container: khabir-v21-test-db (host port 5433)
current_database(): khabir_test
current_user: khabir
PostgreSQL: 16.4
safety marker: khabir-test
applied migrations: 18
```

No Supabase, `khabir-dev`, `khabir-prod`, production deployment, or shared environment was accessed.

---

## A. Executive Summary

The backend is substantially implemented, internally coherent, and green under its local automated suite. Identity, RBAC, request lifecycle, manual-payment approval, notifications, chat, reviews, merchant operations, and admin operations all have real implementations and meaningful negative-path tests. The database migration chain applies cleanly locally, matches the Prisma schema, and has a CI drift gate.

The release is still **not production-ready**:

1. An email change through `PATCH /me` can be followed by a password reset without proving ownership of the new address. Once live reset delivery is enabled, this is an account-takeover chain.
2. The RLS design depends on the runtime connecting as the table owner/`BYPASSRLS` role, while the repository's own least-privilege guidance recommends a non-owner `khabir_prisma` role with no policies. That combination would make the runtime see zero rows and fail writes.
3. The default-drop migration makes rollback to the legacy image (`94bdfcb`) unsafe: the legacy rate-limiter INSERT omits `id`/`updated_at`, and the release gate itself proves it fails with PostgreSQL `23502`.
4. Public client ACLs were revoked on only two tables; RLS is enabled broadly, but the other tables retain grants and are one policy mistake away from exposure.
5. Live password-reset delivery has no durable outbox/retry, and several concurrency paths still produce duplicate notifications/rows or 500s instead of controlled 409s.
6. Production database backup/PITR/restore, secrets, hosting, legal/consent, deployment provenance, and owner approval remain unverified and open.

No P0 is confirmed from the code and local database. Three P1 findings are sufficient to block production. The correct next phase is targeted remediation, not release approval.

**Recommended release decision:** keep the existing **NO-GO** and move the release into remediation batches L1–L4.

---

## B. Verified System Inventory

- **Routes:** 108 HTTP route decorators across 27 controllers.
- **Database models:** 37 Prisma models.
- **Migrations:** 18 files, all applied locally; `prisma migrate status` reports up to date.
- **Test specs:** 52 spec files in the worktree (including the untracked test); 49 release specs run by the release-only suite.
- **Production access:** none.

| Area | Main responsibility / endpoints | Models | Existing tests | Audit status |
| --- | --- | --- | --- | --- |
| Auth / admin auth | register, login, refresh, logout, forgot/reset, admin login/refresh/logout | `User`, `RefreshToken`, `PasswordResetToken`, `AdminUser`, `AdminRefreshToken` | Fake-Prisma auth E2E, real-HTTP register/login, delivery unit tests | Implemented; P1 email/reset chain, P2 reset race |
| Me / avatars | `/me`, contact update, three avatar surfaces, storage serving | `User`, profile avatar fields | Avatar E2E + service/image validation tests | Implemented; email change lacks proof of ownership |
| Catalog / discovery | categories, faults, services, technician discovery | `ApplianceCategory`, `Fault`, `Service`, `TechnicianProfile`, `TechnicianServiceArea` | Fake E2E, discovery specs, geo integration | Implemented; category consistency gap |
| Locations | customer-owned locations | `Location` | Real-HTTP E2E | Implemented; ownership checks pass |
| Service requests | create/list/detail/accept/reject/start/complete/cancel | `ServiceRequest`, history | Fake E2E + real-HTTP 9-flow lifecycle + raw concurrency probe | Implemented; atomic state transitions verified |
| Request media | upload URL, confirm, list, view | `ServiceRequestMedia` | Unit tests with stub storage | Implemented; audit/object consistency gap |
| Chat | request/product conversations, messages, inbox | `Conversation`, participants, `Message` | Fake E2E + raw integration | Implemented; lazy-create race |
| Reviews | create, tags, public list | `Review`, tags | Fake E2E + raw integration | Implemented; aggregate race |
| Notifications | list, unread, read, preferences | `Notification`, `NotificationPreference` | Fake E2E + real-DB integration | Implemented; preference gating verified |
| Subscriptions / payments | plans, current/cancel, submissions, proof, admin approve/reject/grants | plans, subscriptions, submissions, grants, audit | Fake E2E + real-HTTP approval race + service unit tests | Core transaction verified; amount/idempotency gaps |
| Merchant / store | profile, products, public store | merchant/profile/product | Fake E2E + real-HTTP ownership | Implemented; product deletion cascades chat |
| Admin | metrics, users, verification, requests, reviews, payments, audit, notifications | admin/audit/payment models | Fake E2E + real-HTTP RBAC/approval subset | Default-deny RBAC verified |
| Health / operations | `/health`, `/health/live`, `/ready` | none | Fake readiness + real subprocess shutdown | Liveness/shutdown verified; readiness too shallow |
| Storage | local/S3 avatars, proofs, request media | storage keys on models | Config/validation/unit tests; no real S3 E2E | Local/stub only; production S3 NOT VERIFIED |

### Verified-good backend controls

- Argon2id password hashing with fail-closed verification; no plaintext storage.
- Refresh tokens are 48-byte CSPRNG values, stored only as SHA-256 hashes, rotated atomically, with family replay revocation.
- Separate user/admin JWT secrets, issuers, audiences, and token versions.
- Guards reload principal role/status/tokenVersion from the database on every request.
- Admin RBAC is default-deny; all admin routes are metadata-audited.
- Ownership scoping covers requests, locations, merchant products, chats, notifications, subscriptions, and proofs; cross-account access is a uniform 404.
- CORS uses an explicit allowlist; security headers are set; `X-Powered-By` is removed.
- Raw SQL found in production code is parameterized Prisma tagged SQL.
- Service-request transitions use atomic status/actor-scoped writes with history and notification in one transaction.
- Payment approval locks the user row, expires overdue subscriptions, rejects stacking, and commits submission + subscription + audit + notification in one transaction.
- Real-HTTP concurrent approval test passes: one 200, one 409, one subscription, one notification.
- Graceful SIGTERM/SIGINT shutdown closes the port and disconnects Prisma (real subprocess test).
- Notification preference gating is transactional for business notifications; mandatory verification/admin families cannot be disabled.
- CI replays all migrations on a PostGIS database and runs a Prisma schema-drift gate.

---

## C. Database Integrity & Migration Assessment

### Verified facts

- `prisma validate` succeeds.
- `prisma migrate status` against the isolated `khabir_test` database: **18 migrations found, database schema up to date**.
- Migration 18/18 includes the rate-limit default-drop and relation-alignment migrations.
- No `DROP TABLE`, `DROP COLUMN`, or data-rewrite migration was found.
- The rate-limiter raw INSERT now supplies `id` and `updated_at` after the defaults were dropped; the real-Postgres E2E path passes.
- Core constraints verified:
  - `users_phone_or_email_required`.
  - `reviews_rating_range` 1–5.
  - `favorites_single_target` XOR.
  - `conversations_scope_exclusive`.
  - One review per request.
  - One grant per `(user, entitlement)`.
  - One technician service-area label per technician.
- PostGIS geography is derived by trigger; clients never write it directly.
- Money is consistently `DECIMAL(10,2)` at the column level.

### Key database findings

1. **RLS vs runtime role is unresolved.** The RLS migration says the application runs as `postgres`, which has `BYPASSRLS`; `docs/local-dev.md` recommends a non-owner `khabir_prisma` role. With no RLS policies, a non-owner runtime sees zero rows and cannot write. If the runtime is the owner, RLS is bypassed and is not an application authorization boundary. This must be decided and proven on the production database. See `DB-001`.
2. **Public ACLs remain broad.** Only `rate_limit_buckets` and `notification_preferences` have `REVOKE ALL` from `anon/authenticated`; the RLS migration itself records that the public schema previously had 273 grants per client role. RLS blocks ordinary row DML for non-owners, but retained grants are a latent risk and `TRUNCATE` is not RLS-filtered. See `SEC-001`.
3. **Default drop breaks rollback.** `20261020091000` drops `rate_limit_buckets.id/updated_at`. Commit `94bdfcb` inserts only policy/identifier/window/count. The release gate already proves that combination fails with `23502`; the rollback runbook nevertheless says to redeploy the previous image and not restore defaults. See `OPS-001`.
4. **Cross-category service/fault links are not constrained.** `service_requests` independently references category, service, and fault. The create service validates existence only. A request can cite a service/fault belonging to another category. See `DB-002`.
5. **Review attribution and aggregate updates are not DB-protected.** `reviews.customer_id`/`technician_id` are plain FKs; the service derives them from the request, but the DB does not enforce the relationship. Concurrent reviews recompute the technician aggregate without a row lock, so `ratingCount` can lose an update. See `PAY-005`.
6. **Product deletion erases chat history.** Product conversations and messages cascade from `products`. `DELETE /merchant/products/:id` is a hard delete. See `DB-003`.
7. **Product-conversation initiator has no FK/NOT NULL.** `initiator_user_id` was added without a foreign key or scope check. A NULL initiator also defeats the `(product_id, initiator_user_id)` uniqueness intent because PostgreSQL treats NULLs as distinct. See `DB-004`.
8. **Business timestamps are naive.** Most business tables use `TIMESTAMP(3)` (without time zone), while rate-limit/notification-preference tables use `TIMESTAMPTZ`. The `set_updated_at()` trigger writes `CURRENT_TIMESTAMP` into a naive column, so a non-UTC session time zone can shift values relative to Prisma UTC writes. See `DB-005`.
9. **Rate-limit retention is not scheduled.** `pruneExpired()` exists but has no caller; no scheduler was found. The table grows indefinitely and has no standalone `window_start` index. See `DB-006`.
10. **Deployment runbook is stale.** `docs/14_PRODUCTION_DEPLOY_RUNBOOK.md` still says “15 applied” and “prod is 7 of 8,” while the tree has 18 migrations and the release gate records 18. See `DB-007`.

### Migration integrity assessment

- The chain is ordered and applies from an empty PostGIS database in CI.
- The three `20261020*` migrations are consistency fixes, not business changes.
- `20261020092000` drops and re-adds three FKs to add `ON UPDATE`; it is non-idempotent and takes `ACCESS EXCLUSIVE` locks, but the tables are small at current scale.
- `20260911000000` references a trigger function created in `20260910000000`; ordering is correct, but the comment is misleading.
- `20261013000000` depends on a helper created by the rate-limit migration; a second duplicate updated-at helper exists. Hygiene issue only.
- No evidence of data-destructive rewrites in the migration chain.

---

## D. Security & Authorization

### D.1 P1 findings

#### AUTH-001 — Email change + reset can become account takeover

**Status:** CODE-REVIEW ONLY (live reset delivery is not configured)  
**Severity:** P1

`PATCH /me` accepts an email change from any authenticated session without re-entering the current password (`apps/api/src/me/me.controller.ts:44-53`, `apps/api/src/auth/auth.service.ts:276-319`). The new address is stored with `emailVerified=false` (`auth.service.ts:318-319`), but `forgot-password` looks up the user by email and issues a reset token without checking `emailVerified` (`apps/api/src/auth/password-reset.service.ts:94-110`). The delivery adapter accepts `http://` as well as `https://` (`apps/api/src/auth/auth.module.ts:52-55`).

**Impact:** A stolen 15-minute access token, or an account registered with a typo/attacker-controlled address, can be converted into persistent account takeover: change email → request reset → set a new password. Email verification alone does not close the session-theft case if the attacker can change the address; the change itself needs stronger proof.

**Required fix:**

- Require current password or a recent re-authentication before changing the reset-capable email.
- Require verification of the new address before it can receive reset mail; notify the old address.
- Revoke other sessions and bump `tokenVersion` on contact change.
- Require `https://` for the delivery webhook in production.

**Acceptance:** reset to a changed-but-unverified address is refused; verified address works; old address is notified; HTTP delivery is rejected in production.

#### DB-001 — RLS role contract can cause a total API outage or a false security claim

**Status:** NOT VERIFIED (production role unknown)  
**Severity:** P1 (P0 if deployed with a non-owner role and no policies)

The RLS migration explicitly assumes the runtime is the Supabase `postgres` role with `BYPASSRLS` (`apps/api/prisma/migrations/20261008000000_enable_public_rls/migration.sql:6-11`). The local-dev guide recommends `khabir_prisma`, a non-owner role with table privileges (`docs/local-dev.md:101-118`), while the release gate requires a “least-privilege runtime role” (`docs/releases/V2.1.0-RELEASE-GATE.md:70-71`). RLS is enabled with **no policies**.

- If runtime = owner/`BYPASSRLS`: RLS protects only PostgREST/anon, not the application. It is not an application authorization boundary.
- If runtime = non-owner `khabir_prisma` without policies: every `SELECT` returns zero rows and every write fails with `42501`; the API is down.

**Required fix:** choose and document exactly one model. Either (a) runtime is the owner/BYPASSRLS role, and RLS is explicitly documented as PostgREST-only hardening, or (b) runtime is a non-owner role with explicit policies or `BYPASSRLS`, and that role is tested against the migrated schema.

**Acceptance:** on the production DB, record `current_user`, table owner, `relrowsecurity`, `relforcerowsecurity`; then run `SELECT count(*) FROM users` and one insert as the runtime role. Both must succeed, or the API must be declared broken.

#### OPS-001 — Rollback below the rate-limit fix is unsafe

**Status:** VERIFIED (code + CI negative control); rollback not executed  
**Severity:** P1

`20261020091000` drops `rate_limit_buckets.id/updated_at` defaults (`apps/api/prisma/migrations/20261020091000_drop_legacy_uuid_defaults/migration.sql:42-43`). Legacy `94bdfcb` inserts only `policy`, `identifier`, `window_start`, `count` into that table. The release gate records that the legacy negative control fails with PostgreSQL `23502` (`docs/releases/V2.1.0-RELEASE-GATE.md:40-42`). The rollback runbook says to redeploy the previous known-good image and “do not restore the defaults” (`docs/releases/DEPLOYMENT-PROVENANCE-AND-ROLLBACK.md:110-115`).

**Impact:** redeploying an image older than `c903e06` after this migration makes every auth rate-limited route return 5xx (raw INSERT has no id), including login, register, refresh, and password reset.

**Required fix:** either restore the two defaults in a forward migration, or formally set the rollback floor to `c903e06`/the new image and add a pre-deploy check that rejects older images. The runbook must state the floor explicitly.

**Acceptance:** previous image against migrated DB → `POST /auth/login` returns 401/200, never 5xx; or rollback is blocked by policy and the floor is recorded.

### D.2 P2 security findings

- **SEC-001 — Client ACL hardening covers only 2 of 35+ tables.** Only `rate_limit_buckets` and `notification_preferences` are revoked from `anon/authenticated` (`20261011202423...:22`, `20261017000000...:35`). RLS is enabled broadly, but retained table grants and `TRUNCATE` privileges are not covered by row policies. **Fix:** one migration revoking all public table privileges and setting default privileges; verify `information_schema.role_table_grants` returns zero for client roles. **Status:** CODE-REVIEW ONLY (production ACLs not inspected).
- **SEC-002 — Presigned uploads are size-unbounded and orphaned.** `presignPut` signs MIME type but not `Content-Length` (`apps/api/src/storage/s3-proof-storage.adapter.ts:88-105`); `maxBytes` is informational. `confirmProof` rejects oversized/invalid objects but does not delete them (`apps/api/src/subscriptions/proof.service.ts:109-155`). Presign issuance has no dedicated rate limit. **Fix:** sign `ContentLength` or use a POST policy with `content-length-range`; add issuance throttling and lifecycle/cleanup on rejection. **Status:** CODE-REVIEW ONLY (S3 not configured).
- **AUTH-002 — User and admin lockout share the same account key.** Both login paths pass the lowercased email to the same `login-user` policy (`shared-store-login-attempt.guard.ts:24-46`; `auth.service.ts:136`; `admin-auth.service.ts:52`). An unauthenticated attacker can spend 20 failures across IPs on an admin email through `/auth/login` and deny admin login for the 60-minute window. Five failures from one NAT IP also affect all users behind it by design. **Fix:** namespace keys (`user:`/`admin:`) and consider progressive delay/CAPTCHA instead of hard per-account lockout. **Status:** VERIFIED by code; test asserts the current global lock behavior.
- **AUTH-003 — Registration and contact updates enumerate accounts.** Duplicate registration returns a distinct `409 "phone or email already in use"` (`auth.service.ts:93-107`); `PATCH /me` returns distinct phone/email conflicts (`auth.service.ts:299-319`). **Fix:** uniform response/timing for registration, generic conflict wording for contact updates. **Status:** VERIFIED.
- **AUTH-004 — Reset-token single-use is racy.** `consumeReset` checks `usedAt` before the transaction, then updates by `id` only (`password-reset.service.ts:159-190`). Two concurrent requests can both pass and both change the password. **Fix:** atomically claim with `updateMany({ where: { id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } })` and abort if `count !== 1`. **Acceptance:** concurrent pair → one 204, one 401; only first password works. **Status:** INFERRED (code path; not executed).
- **AUTH-005 — Reset delivery has no durable outbox/retry.** The token is persisted, then delivery is fired with `void` (`password-reset.service.ts:115-125`); a process restart or gateway 5xx loses the email after the API returned 202. **Fix:** transactional outbox + retrying worker/dead-letter + pending/failed metrics. **Status:** CODE-REVIEW ONLY (live delivery blocked by #27).
- **AUTH-006 — “Global” logout does not revoke other refresh families.** Logout revokes its own family and bumps `tokenVersion`, but refresh does not check `tokenVersion`; another family can mint a fresh access token. The code comment promises “every access token,” not every refresh family. **Fix:** decide per-device vs global semantics; if global, revoke all families. **Status:** VERIFIED.
- **SEC-003 — Auth responses lack `Cache-Control: no-store`.** Security headers do not set cache directives (`security-headers.middleware.ts:19-30`); login/refresh responses contain bearer tokens. **Fix:** set `Cache-Control: no-store` and `Pragma: no-cache` on auth/admin-auth and authenticated responses. **Status:** VERIFIED by code; P3.
- **SEC-004 — Proof controller lacks explicit role metadata.** `ProofController` has `JwtAuthGuard` but no `@Roles`; authorization relies entirely on service ownership (`proof.controller.ts:40-80`). No current cross-user access was found. **Fix:** add explicit roles/metadata audit. **Status:** VERIFIED; P3 defense-in-depth.

### Verified-good security controls

- Argon2id with `m=19456, t=2`; fail-closed verification.
- Refresh rotation uses conditional `updateMany`; concurrent reuse yields one winner.
- Admin/user JWT authority separation and DB-loaded roles.
- Default-deny admin RBAC; route-audit test.
- Ownership scoping and uniform 404s across requests, locations, products, chats, notifications, subscriptions, proofs.
- CORS allowlist; security headers; no framework advertisement.
- No unsafe raw SQL in production code.
- Admin audit writes are in the same transaction as the sensitive mutation.
- Private storage keys are server-generated; proof/media URLs are participant/admin scoped and short-lived (300s ceiling).

---

## E. Business Logic & Transaction Safety

### Verified-good

- Payment approval serializes on the user row, expires overdue subscriptions, rejects stacking, and commits submission + subscription + audit + notification atomically.
- The real-HTTP approval race test passes with one winner, one 409, one subscription, and one notification.
- Service-request accept/reject/start/complete/cancel use atomic guarded writes; history and notifications are in the same transaction.
- Admin request override, assignment, verification, and moderation write audit + notification transactionally.
- Entitlement grants are unique per `(user, entitlement)` at the DB level.
- Notification preferences are gated at write time; mandatory families have no preference key.

### P2 business findings

- **PAY-001 — Manual payment submissions do not snapshot amount/currency.** `PaymentSubmission` stores plan, method, transfer reference, and proof metadata, but no amount/currency (`schema.prisma:960-990`). Approval uses the plan relationship, not the amount transferred at submission. A plan price change makes the historical payment unauditable. **Fix:** store `amount`/`currency` at submission and assert the approved plan price/amount policy; this is also a CTO/product decision. **Status:** VERIFIED schema.
- **PAY-002 — Payment submission creation has no idempotency key.** Repeated POSTs create multiple pending rows; no unique `(user, plan, transfer_reference)` or idempotency key. **Fix:** add a client idempotency key or transfer-reference uniqueness per user; return the existing pending submission on retry. **Status:** VERIFIED code.
- **PAY-003 — Concurrent cancellation can duplicate the notification.** `cancelRenewal` reads `renewalEnabled` before the update; two concurrent transactions can both see `true` and both emit the confirmation (`subscriptions.service.ts:203-228`). The update is not guarded by `renewalEnabled: true`. **Fix:** claim with `updateMany({ where: { id, userId, status: 'active', renewalEnabled: true }, data: { renewalEnabled: false, cancelledAt } })`; notify only when `count === 1`. **Status:** INFERRED (race).
- **PAY-004 — Concurrent entitlement grant returns 500.** The duplicate check is outside the transaction (`subscriptions.service.ts:350-358`); the loser hits the unique constraint, which is not mapped to 409 by the global filter. **Fix:** move the check into the transaction or map `P2002` to 409. **Status:** INFERRED.
- **PAY-005 — Review aggregate loses updates; duplicate review is a 500.** `create` recomputes all ratings and writes `ratingCount`/`ratingAverage` without locking the technician row (`reviews.service.ts:114-123`). Two concurrent reviews on different requests can both write count=1. A concurrent duplicate review hits the unique constraint and returns 500 because `P2002` is not mapped (`reviews.service.ts:72-96`). **Fix:** lock the technician row or aggregate atomically; map unique violations to 409. **Status:** INFERRED.
- **PAY-006 — Chat lazy-create turns a double tap into a 500.** Request and product conversation creation both use `findFirst` → `create` without catching the unique constraint (`chat.service.ts:127-159`, `188-209`). **Fix:** `upsert` or catch `P2002` and refetch. **Status:** INFERRED.
- **PAY-007 — Media/proof row and object lifecycle is not atomic.** In `confirmMedia`, the media row commits, then the audit runs outside the transaction; if audit fails, the catch deletes the object but the row remains (`request-media.service.ts:155-189`). `confirmProof` updates the submission, then audits outside the transaction; an audit failure returns 500 with the proof already bound (`proof.service.ts:136-155`). **Fix:** include audit in the same transaction; only delete objects for pre-commit failures. **Status:** VERIFIED code.
- **DB-002 — Service/fault can belong to another appliance category.** The request references category, service, and fault independently; create validates existence but not category consistency (`service-requests.service.ts:157-180`; migration `20260910000000:250-257`). **Fix:** composite FK/unique `(id, appliance_category_id)` on services/faults or a trigger. **Status:** VERIFIED.
- **DB-003 — Product deletion erases conversations and messages.** `products` → `conversations` is `ON DELETE CASCADE` (`20260916000000:21-22`); messages cascade from conversations. `DELETE /merchant/products/:id` is a hard delete (`products.service.ts:190-195`). **Fix:** soft delete/suspend or block deletion when conversations exist; decide retention with legal/product. **Status:** VERIFIED.
- **DB-004 — Product conversation initiator has no FK/scope constraint.** `initiator_user_id` is nullable and has no FK (`20260916000000:12-26`); the unique index on `(product_id, initiator_user_id)` does not prevent multiple NULL initiators. **Fix:** FK + `CHECK (product_id IS NULL OR initiator_user_id IS NOT NULL)`. **Status:** VERIFIED.
- **DB-005 — Naive timestamps can shift under non-UTC sessions.** Business tables use `TIMESTAMP(3)` (`20260101000000:39-41`, `20260910000000:65-66`); the trigger writes `CURRENT_TIMESTAMP` (`20260101000000:116-121`). **Fix:** migrate business timestamps to `timestamptz` or force UTC sessions. **Status:** VERIFIED schema.
- **DB-006 — Rate-limit table has no scheduled retention.** `pruneExpired` has no caller (`rate-limit.service.ts:201-210`); the only composite index starts with `policy`, so pruning by `window_start` scans. **Fix:** scheduler/startup hook + `window_start` index. **Status:** VERIFIED implementation.
- **DB-007 — Deployment runbook migration count is stale.** `docs/14_PRODUCTION_DEPLOY_RUNBOOK.md:58` says “15 applied”; `:84` says “7 of 8.” The tree and release gate have 18. **Fix:** regenerate the list/count from `migrations/`; do not use this runbook until corrected. **Status:** VERIFIED docs.
- **API-001 — Rejecting an unknown payment submission returns 409, not 404.** `adminReject` claims `updateMany({ id, status: 'pending' })` first; an unknown id has count 0 and returns stale → 409 (`payments.service.ts:403-458`), while Swagger documents 404 (`admin-payments.controller.ts:148`). **Fix:** look up first or distinguish not-found from already-reviewed. **Status:** VERIFIED code; P3.
- **API-002 — Malformed `mediaId` can become a 500.** `UuidParamPipe` only validates `id`/`serviceId` (`uuid-param.pipe.ts:21`); `GET /service-requests/:id/media/:mediaId/url` passes `mediaId` to Prisma (`request-media.controller.ts:104-113`). **Fix:** include `mediaId` or validate in the route. **Status:** CODE-REVIEW ONLY; P3.
- **API-003 — Media cap can be exceeded by concurrent confirms.** Count and create run in a default-isolation transaction with no reservation or unique ordinal (`request-media.service.ts:155-168`). **Fix:** lock the request row or enforce a unique slot. **Status:** INFERRED; P3.

---

## F. API Contract & Error Handling

### Verified-good

- Canonical success/error envelopes are consistent.
- Zod strips unknown fields; registration role is allowlisted; mass assignment is not available.
- 400/401/403/404/409/429/5xx mappings are centralized; 5xx details are hidden in production.
- Pagination is bounded and tested.
- Cross-account reads/mutations return uniform 404.
- Admin role mismatch is 401 at the guard and 403 at the admin-role guard; accepted role lists are not echoed.
- Request IDs are propagated and logged.

### Contract gaps

- Admin reject unknown id: 409 vs documented 404 (API-001).
- Malformed `mediaId`: possible 500 (API-002).
- Proof/média presign and confirm are not covered by real HTTP E2E; only service/unit tests with stub storage.
- Auth refresh/replay/reset/lockout are tested primarily with FakePrisma; the real-HTTP suite covers register/login but not the full token lifecycle.
- `NODE_ENV=prod` is accepted as a valid value and disables production-only error masking and trust-proxy defaults (REL-002).
- Auth responses lack cache directives (SEC-003).

---

## G. Performance, Reliability & Operations

- **No capacity claim is made.** No load test was run against production or shared infrastructure.
- Lists are paginated; chat inbox enrichment is bounded; media lists are bounded to 50.
- Index gaps:
  - `notifications(user_id, read_at)` does not match `ORDER BY created_at DESC` (`20260910000000:541`; `notifications.service.ts:196-205`).
  - `reviews(technician_id)` does not cover `(technician_id, created_at)` order (`20260910000000:336`).
  - Request lists filter owner/technician + status and order by `created_at`; only single-column indexes exist (`20260910000000:264-268`).
  - Audit list orders by `created_at` without a covering index.
  - GiST indexes exist for coordinates but no code path uses geo distance; discovery uses `label_ar contains` without a trigram index.
- **Readiness is too shallow.** `/ready` executes `SELECT 1` only (`health.controller.ts:29-32`). A reachable database with missing migrations/permissions still reports ready. Docker and Render probe `/health` (liveness), not `/ready` (`apps/api/Dockerfile:60-61`, `render.yaml:29`).
- **Logs are mixed-format.** `StructuredLogger` drops arbitrary fields such as `status`/`code`/`detail` (`structured-logger.ts:39-47`); several callers use Nest's `Logger`, which prefixes JSON and breaks line parsing (`http-logging.interceptor.ts:40,72`; `main.ts:33`).
- **Rate-limit buckets are not pruned** (DB-006); general HTTP throttling is per-instance in memory, so N instances multiply the effective per-IP budget. This is documented, but production sizing is not verified.
- **Graceful shutdown is verified** by a real subprocess test: SIGTERM/SIGINT close the port and disconnect Prisma.
- **Connection pool/timeout settings** are not profiled; no production pool evidence exists.

---

## H. Backup, Restore & Disaster Recovery

- **Production backup/PITR: NOT VERIFIED.** No Supabase/Render/etc. access was available. No production backup configuration, retention, encryption, restore point, or PITR evidence was inspected.
- **RPO/RTO: NOT DOCUMENTED** in a verifiable production policy. The runbook describes procedures, not approved targets or measured restore time.
- **Local drill only.** A prior disposable local drill restored `khabir_test` into `khabir_restore_test`: 40 public tables, 18 migrations, 6 users, 0 service requests, and no `rate_limit_buckets.id/updated_at` defaults. This proves mechanics on a disposable local database; it does **not** prove a production backup exists or that production can be restored.
- **Rollback vs restore:** the default-drop migration makes image rollback below `c903e06` unsafe (OPS-001). Restoring an older schema snapshot into the new image, or the reverse, needs an explicit compatibility check.
- **Required owner/DevOps evidence:** daily backup + PITR enabled; retention recorded; restore into a separate non-production instance; schema/row verification; measured RTO; no credentials in the issue.

**Status:** NOT VERIFIED — production gate remains open (#24).

---

## I. Test Baseline

All DB-backed commands ran only after proving the local target was `khabir_test` with the `khabir-test` marker. No production or shared database was used.

| Command | Target / tree | Exit | Result | Caveat |
| --- | --- | ---: | --- | --- |
| `pnpm --filter @khabir/api test` | current worktree; includes untracked test | 0 | 50 files, **463 passed** | Includes untracked `admin-payments-decisions.e2e.spec.ts`; not release-only |
| `vitest run --exclude test/admin-payments-decisions.e2e.spec.ts` | current worktree, release-only | 0 | 49 files, **435 passed** | Dist-import coverage caveat |
| `pnpm --filter @khabir/api test:http-e2e` | local `khabir_test` | 0 | 3 files, **22 passed** | No proof/media/S3 path |
| `pnpm --filter @khabir/api exec prisma validate` | schema only | 0 | Schema valid | — |
| `pnpm --filter @khabir/api exec prisma migrate status` | local `khabir_test` | 0 | 18 migrations, up to date | Local only |
| GitHub CI `39648511261` | release `739f9eb` | success | All four jobs green | CI, not production runtime |

Coverage from the full package script: **15.84% statements**, but E2E tests import the compiled `dist/` application, so source instrumentation is largely bypassed. The percentage is not a meaningful measure of backend coverage; the meaningful evidence is the test matrix and its gaps.

### Test coverage gaps

- Auth refresh rotation/replay, reset consumption, and lockout are primarily FakePrisma tests; real HTTP covers only register/login. This did not catch AUTH-001/AUTH-004.
- `subscriptions.integration.spec.ts` reimplements the approval transaction with raw Prisma rather than invoking `PaymentsService`; the real-HTTP payment test does exercise the service and race.
- `service-requests.integration.spec.ts` races raw Prisma writes, not `ServiceRequestsService`; the service path is covered by HTTP E2E.
- Merchant/chat/review “integration” tests are mostly raw Prisma, not service logic.
- Proof/media storage tests use stubs; no S3/MinIO HTTP E2E, no admin proof URL E2E.
- `graceful-shutdown.spec.ts` skips locally without a test DB; CI requires it.
- `apps/api/tsconfig.json` excludes `test/`, so tests are not typechecked by the API typecheck script.
- The HTTP harness does not apply `main.ts` cookie parser/CORS/trust-proxy/shutdown bootstrap; it tests the Nest app, not the exact production bootstrap.

---

## J. Production Configuration Gates

| Requirement | Documented | Startup validation | Production verified | Owner / evidence |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` / `DIRECT_URL` | Yes | Required, missing fails | **NOT VERIFIED** | DevOps/owner; exact SHA + role |
| RLS runtime role | Contradictory | No role-contract check | **NOT VERIFIED** | Owner/DevOps; prove owner vs non-owner |
| `CORS_ORIGINS` | Yes | Optional; empty disables CORS | **NOT VERIFIED** | DevOps; exact web/admin origins |
| User/admin JWT secrets | Yes | Required, >=32 chars, distinct | **NOT VERIFIED** | DevOps; secret store; placeholders not rejected |
| `TRUST_PROXY_HOPS` | Yes | Numeric; default 1 only when `NODE_ENV === 'production'` | **NOT VERIFIED** | DevOps; `NODE_ENV=prod` bypasses default |
| Password-reset webhook | Yes | Optional; accepts `http://` and `https://` | **NOT VERIFIED** | Owner/QA; HTTPS + mailbox + message IDs |
| Proof S3 / local provider | Yes | Local blocked only when `NODE_ENV === 'production'` | **NOT VERIFIED** | DevOps; private bucket, credentials, lifecycle |
| Rate-limit budgets | Yes | Numeric defaults | **NOT VERIFIED** | DevOps; sizing vs replica count |
| Health/readiness probes | Code exists | `/health` process-only; `/ready` SQL only | **NOT VERIFIED** | DevOps; wire `/ready` and migration check |
| Logging | Code exists | No unified JSON logger | **NOT VERIFIED** | DevOps; parseable logs + alerts |
| DB extensions/roles | Partial | Migration role vs runtime role unresolved | **NOT VERIFIED** | DevOps; PostGIS, uuid-ossp, pgcrypto, grants |
| Backups/PITR | Runbook only | No startup check | **NOT VERIFIED** | Owner/DevOps; dashboard + restore drill |

`NODE_ENV` is cast to the union without strict validation (`app.config.ts:105`). `NODE_ENV=prod` is not `production`, so production-only 5xx masking, trust-proxy defaults, and the proof-local guard do not apply. This is a dangerous deployment footgun.

`PASSWORD_RESET_DELIVERY_URL` accepts `http://` (`auth.module.ts:52-55`). In production, a reset token sent over cleartext is a credential leak.

---

## K. Findings Register

### P0 — Critical

**None confirmed.** No finding was proven to cause immediate data loss or an unauthenticated security breach in the current local baseline. Two P1 deployment findings (DB-001, OPS-001) would become operational P0s if the wrong database role or rollback image is used.

### P1 — High

| ID | Status | Evidence | Impact | Required fix / acceptance |
| --- | --- | --- | --- | --- |
| AUTH-001 | CODE-REVIEW ONLY | `me.controller.ts:44-53`; `auth.service.ts:276-319`; `password-reset.service.ts:94-115` | Email change + reset → persistent account takeover once delivery is live | Re-auth + verify new email before resets; notify old address; revoke sessions; HTTPS webhook. Acceptance: unverified changed address cannot receive a reset. |
| DB-001 | NOT VERIFIED | `20261008000000:6-11`; `docs/local-dev.md:101-118`; release gate `:70-71` | Runtime as non-owner with no RLS policies → total API outage; runtime as owner → RLS not an app boundary | Define role contract; prove `SELECT`/`INSERT` as runtime; document owner/BYPASSRLS or add policies. |
| OPS-001 | VERIFIED | `20261020091000:42-43`; legacy `94bdfcb`; gate `:40-42`; rollback doc `:110-115` | Rollback to legacy image → auth routes 5xx (`23502`) | Restore defaults or set rollback floor `c903e06`; rehearse login after rollback. |

### P2 — Medium

| ID | Status | Evidence | Impact | Required fix / acceptance |
| --- | --- | --- | --- | --- |
| SEC-001 | CODE-REVIEW ONLY | Only 2 `REVOKE ALL` migrations; RLS migration header records broad grants | Retained client grants/TRUNCATE; one policy error re-opens surface | Revoke all public table grants + default privileges; verify zero grants. |
| SEC-002 | CODE-REVIEW ONLY | `s3-proof-storage.adapter.ts:88-105`; `proof.service.ts:109-155` | Unbounded presigned uploads; orphan objects/cost abuse | Sign content length or POST policy; throttle issuance; delete rejected objects. |
| AUTH-002 | VERIFIED | `shared-store-login-attempt.guard.ts:24-46`; both login services | Public user-login failures can lock admin login; NAT lockout | Namespace user/admin keys; consider progressive delay. |
| AUTH-003 | VERIFIED | `auth.service.ts:93-107,299-319` | Account/phone/email enumeration via 409 | Uniform registration/contact responses and timing. |
| AUTH-004 | INFERRED | `password-reset.service.ts:159-190` | Two concurrent resets can both succeed | Atomic `updateMany` claim; one 204/one 401. |
| AUTH-005 | CODE-REVIEW ONLY | `password-reset.service.ts:115-125` | 202 returned but delivery can be lost on restart/5xx | Transactional outbox + retry/dead-letter + metrics. |
| REL-001 | VERIFIED | `health.controller.ts:29-32`; `Dockerfile:60-61`; `render.yaml:29` | Missing migrations/permissions still report ready; probes use liveness only | Readiness checks migration table/critical access; wire `/ready`. |
| REL-002 | VERIFIED | `app.config.ts:105,135`; `api-exception.filter.ts:74` | `NODE_ENV=prod` bypasses production protections | Strict enum validation; reject placeholder secrets; explicit proxy posture. |
| REL-003 | VERIFIED | `structured-logger.ts:39-47`; `http-logging.interceptor.ts:40,72`; `main.ts:33` | Logs are prefixed/incomplete; fields dropped | `app.useLogger`; one JSON object per line; preserve status/code/detail. |
| PAY-001 | VERIFIED | `schema.prisma:960-990` | No amount/currency snapshot; plan price changes make payment unauditable | Snapshot amount/currency; define approval price policy. |
| PAY-002 | VERIFIED | `payments.service.ts:110-180` | Retried POST creates duplicate pending submissions | Idempotency key or per-user transfer-reference uniqueness. |
| PAY-003 | INFERRED | `subscriptions.service.ts:203-228` | Concurrent cancels can duplicate notification | Guard update on `renewalEnabled: true`; notify when count=1. |
| PAY-004 | INFERRED | `subscriptions.service.ts:350-358` | Concurrent grant returns 500 | In-transaction claim or map P2002→409. |
| PAY-005 | INFERRED | `reviews.service.ts:72-123` | Lost rating aggregate update; duplicate concurrent review 500 | Lock technician row/atomic aggregate; map P2002→409. |
| PAY-006 | INFERRED | `chat.service.ts:127-159,188-209` | Double-tap conversation create → 500 | Upsert or catch P2002/refetch. |
| PAY-007 | VERIFIED | `request-media.service.ts:155-189`; `proof.service.ts:136-155` | Row committed then audit fails; media object deleted after commit; proof bound despite 500 | Audit in same transaction; object cleanup only pre-commit. |
| DB-002 | VERIFIED | `service-requests.service.ts:157-180`; migration `20260910000000:250-257` | Cross-category service/fault references corrupt request semantics | Composite FK/trigger; reject cross-category insert. |
| DB-003 | VERIFIED | `products.service.ts:190-195`; `20260916000000:21-22` | Product deletion erases buyer/merchant messages | Soft delete/block deletion or approved retention decision. |
| DB-004 | VERIFIED | `20260916000000:12-26`; `schema.prisma:687-705` | No initiator FK; NULL unique hole; dangling user id | FK + product-scope check. |
| DB-005 | VERIFIED | `20260101000000:39-41,116-121`; domain `TIMESTAMP(3)` columns | Non-UTC sessions shift `updated_at` vs Prisma UTC | `timestamptz` or forced UTC sessions. |
| DB-006 | VERIFIED | `rate-limit.service.ts:201-210`; no caller | Unbounded bucket growth; prune seq scan | Scheduler + `window_start` index. |
| DB-007 | VERIFIED | `docs/14...:58,84` | Runbook says 15/“7 of 8” vs 18 actual; deployer misled | Regenerate list/count; align with release gate. |
| TEST-001 | VERIFIED | `auth.e2e.spec.ts:104-107`; HTTP E2E critical flows | Auth refresh/reset/lockout are fake-only; AUTH-001/004 escaped | Real-DB HTTP tests for refresh/replay/reset/lockout/contact change. |

### P3 — Low / hardening

| ID | Status | Evidence | Impact / fix |
| --- | --- | --- | --- |
| AUTH-006 | VERIFIED | `auth.service.ts:181-256` | “Global” logout leaves other refresh families; decide semantics/revoke all. |
| SEC-003 | VERIFIED | `security-headers.middleware.ts:19-30` | Auth responses lack `Cache-Control: no-store`. |
| SEC-004 | VERIFIED | `proof.controller.ts:40-80` | No explicit role metadata; relies on service ownership. |
| API-001 | VERIFIED | `payments.service.ts:403-458`; controller `:148` | Unknown reject id → 409 vs documented 404. |
| API-002 | CODE-REVIEW ONLY | `uuid-param.pipe.ts:21`; media controller `:104-113` | Invalid `mediaId` can become 500. |
| API-003 | INFERRED | `request-media.service.ts:155-168` | Concurrent confirms can exceed media cap. |
| DB-008 | VERIFIED | schema money/coordinate columns | No non-negative money checks, no `from <= to`, no half-coordinate check. |
| DB-009 | VERIFIED | `20260910000000:336,541`; discovery query | Index/order mismatches; GiST unused; label search lacks trigram index. |
| DB-010 | VERIFIED | `20261020092000`; duplicate updated-at helpers | Non-idempotent FK swap; duplicate helper; hygiene only at current scale. |
| DB-011 | VERIFIED | `admin-operations.service.ts:316-322` | Admin override writes status without matching timestamps; no DB invariants. |
| TEST-002 | VERIFIED | `real-db-url.ts:26-63` | Integration guard checks host only, not DB name; HTTP harness is strict. |
| TEST-003 | VERIFIED | `apps/api/tsconfig.json` | Test files excluded from typecheck. |
| TEST-004 | VERIFIED | `test/http-e2e/harness.ts:65-69` | Harness skips `main.ts` bootstrap (cookie/CORS/trust proxy/shutdown). |
| PERF-001 | VERIFIED | coverage report | 15.84% source coverage is misleading because E2E imports `dist`. |
| REL-004 | VERIFIED | `rate-limit` identifier/key length | 254-char email + IPv6 can overflow `VARCHAR(255)` and 500 instead of counting. |

---

## L. Recommended Remediation Batches

### L1 — Authentication takeover and reset safety (P1)

- Add re-auth/password proof and verified-new-address gating to email changes; notify the old address; revoke sessions.
- Make reset-token consumption an atomic claim; add a real-DB concurrent test.
- Namespace user/admin lockout keys; add the admin-lockout regression test.
- Require HTTPS for reset delivery; add `no-store` to auth responses.
- Add a transactional reset-delivery outbox or explicitly keep delivery out of the production scope.

**Exit:** AUTH-001/AUTH-004/AUTH-005 closed; real-DB tests prove reset, replay, and contact-change behavior.

### L2 — Database role, ACL, and rollback safety (P1/P2)

- Decide and document the RLS runtime role; prove it on a migrated database.
- Revoke all public client grants and default privileges; verify zero grants.
- Restore the rate-limit defaults or set an explicit rollback floor; rehearse rollback login.
- Make `/ready` check the migration table/critical access; wire `/ready` into the platform probe.
- Strictly validate `NODE_ENV` and reject placeholder secrets.

**Exit:** DB-001, SEC-001, OPS-001, REL-001, REL-002 closed with production-shaped evidence.

### L3 — Financial and concurrency integrity (P2)

- Snapshot payment amount/currency; add submission idempotency.
- Guard cancellation on `renewalEnabled`; map grant/review/chat unique races to 409.
- Move audit writes into the media/proof transactions; clean up only pre-commit objects.
- Add real-HTTP tests for proof/media and the cancel/grant/review races.

**Exit:** PAY-001…PAY-007 closed; no sensitive flow returns 500 for an expected conflict.

### L4 — Data model, performance, and test depth (P2/P3)

- Enforce service/fault category consistency and review attribution in the DB.
- Decide product-chat retention; add initiator FK/scope check.
- Normalize timestamps; add money/coordinate checks.
- Add covering indexes, rate-limit pruning, trigram search, and structured logging.
- Add test typechecking, DB-name guard, and a real-DB auth/HTTP matrix.

**Exit:** DB-002…DB-011, REL-003, TEST-001…TEST-004 closed; load/capacity testing can begin.

---

## M. Final Readiness Verdict

**`PARTIALLY VERIFIED`**

- The backend is implemented, coherent, and green under its current local suite: release-only 49 files/435 tests, HTTP E2E 22/22, 18/18 migrations, schema valid.
- The release still has **3 P1** findings and multiple P2 production-integrity/reliability gaps.
- Production database backup/PITR/restore, secrets/hosting, legal/consent, live email, deployment provenance, and owner approval are **NOT VERIFIED**.
- **Not ready for production approval.**
- **Worth moving to the remediation phase:** yes. The code is stable enough for targeted fixes; this is not a rewrite recommendation.

The existing **NO-GO** remains correct.

---

## N. Owner / DevOps Actions

| # | Action | Owner | Evidence required to close |
| --- | --- | --- | --- |
| 1 | Decide RLS runtime role (owner/BYPASSRLS vs non-owner + policies) and provision it | Owner/DevOps | `current_user`, table owner, RLS flags, successful runtime `SELECT`/`INSERT` |
| 2 | Revoke all public client grants/default privileges or explicitly accept the RLS-only model | DevOps/DB | `role_table_grants` zero for anon/authenticated |
| 3 | Set rollback floor or restore rate-limit defaults; rehearse rollback | DevOps/Release | Previous-image login 401/200, no 5xx; deployment IDs/SHA |
| 4 | Verify production backup, PITR, retention, RPO/RTO, restore into a separate instance | Owner/DevOps | Dashboard/retention evidence; restored schema/row counts; measured RTO (#24) |
| 5 | Approve paid always-on hosting, secret store, CORS, trust proxy, health/ready, logs/alerts | Owner/DevOps | Exact-SHA deployment metadata; probes; redacted env matrix (#25) |
| 6 | Approve legal/privacy/terms/controller and consent persistence/enforcement | Owner/Legal/Product | Immutable versions; controller/contact; consent schema/API decision (#26) |
| 7 | Configure and verify live password-reset delivery with a non-production mailbox | Owner/QA/Provider | Message ID, redacted delivery log, reset E2E, no real-customer mail (#27) |
| 8 | Verify Vercel/Railway provenance and rollback against `739f9eb` | DevOps/Release | Deployment ID, source SHA, CI run, health/title/API-origin checks, rollback evidence (#28) |
| 9 | Approve PR #17 only after gates; keep PR #19 review-only | Owner | PR review/approval; release gate updated |
| 10 | Decide payment amount snapshot/idempotency and product-chat retention policy | Product/CTO | Recorded decision + schema/API acceptance tests |

---

## Evidence Index

| Evidence | Path / reference |
| --- | --- |
| Release CI | GitHub Actions run `39648511261`, SHA `739f9eb`, success |
| Release-only local suite | `.qa/api-audit-release-suite.log` — 49 files / 435 tests |
| Full current-tree suite | `.qa/api-audit-full-test.log` — 50 files / 463 tests (includes untracked test) |
| Real-HTTP E2E | `.qa/api-audit-http-e2e.log` — 3 files / 22 tests |
| Migration status | `.qa/api-audit-migrate-status.log` — 18 up to date |
| Prisma validation | `.qa/api-audit-prisma-validate.log` — valid |
| Local DB identity | `khabir_test` / `khabir` / PostgreSQL 16.4 / marker `khabir-test` |
| Previous local restore drill | `.qa/production-fast-track/local-restore-drill*.log` — disposable local only |
| Release gate | `docs/releases/V2.1.0-RELEASE-GATE.md` |
| Rollback runbook | `docs/releases/DEPLOYMENT-PROVENANCE-AND-ROLLBACK.md` |
| Restore runbook | `docs/releases/PRODUCTION-DATABASE-RESTORE-RUNBOOK.md` |
| Env matrix | `docs/releases/PRODUCTION-ENV-MATRIX.md` |
| Open gates | GitHub issues #24–#28, #30 |
