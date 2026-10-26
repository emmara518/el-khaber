# Backend Remediation — L3 Financial & Concurrency Integrity

**Date:** 2026-10-24  
**Repository HEAD:** `b63354f748bdee1c28cf79f8476f5bed97680810`  
**State:** working-tree changes only; no commit/push/deploy.

## Scope and result

| Finding | Result | Evidence |
| --- | --- | --- |
| `PAY-001` no amount/currency snapshot | **CLOSED** | New `amount`/`currency` columns; submission stores plan snapshot; HTTP assertion 99 EGP |
| `PAY-002` duplicate payment retries | **CLOSED** | Unique `(user, plan, transfer_reference)`; retry returns existing pending submission |
| `PAY-003` duplicate cancellation notification | **CLOSED** | Conditional `renewalEnabled: true` update; notify only on count=1 |
| `PAY-004` concurrent grant 500 | **CLOSED** | Transaction + `P2002` mapping to 409 |
| `PAY-005` review aggregate race / duplicate 500 | **CLOSED** | Technician row lock; `P2002` → 409 |
| `PAY-006` chat lazy-create 500 | **CLOSED** | Catch unique violation and refetch existing conversation |
| `PAY-007` audit/object transaction consistency | **PARTIALLY CLOSED** | Media/proof audit moved into the transaction; proof rejection cleanup still incomplete |

## Implementation

- Added `payment_submissions.amount` and `currency`, backfilled from the plan
  for existing rows, and made them NOT NULL.
- `createSubmission` stores the plan price/currency snapshot.
- Added unique `(user_id, plan_id, transfer_reference)`; retries return the
  existing pending row, reviewed duplicates return 409.
- `cancelRenewal` claims only an active, renewal-enabled subscription and emits
  at most one confirmation.
- `adminGrantEntitlement` and review/chat creation map unique conflicts to 409.
- Review aggregation locks the technician row before recomputing.
- `AuditService.log(input, tx?)` allows audit writes in the caller's
  transaction. Media confirm and proof confirm now write audit atomically;
  media object cleanup occurs only when the transaction fails.
- Proof validation deletes rejected objects for the size/MIME cases covered by
  the new helper.

## Files

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20261022120000_payment_snapshot_idempotency/migration.sql`
- `apps/api/src/subscriptions/payments.service.ts`
- `apps/api/src/subscriptions/subscriptions.service.ts`
- `apps/api/src/subscriptions/proof.service.ts`
- `apps/api/src/reviews/reviews.service.ts`
- `apps/api/src/chat/chat.service.ts`
- `apps/api/src/audit/audit.service.ts`
- `apps/api/src/service-requests/request-media.service.ts`
- `apps/api/src/common/errors.ts`
- `apps/api/src/common/openapi/contract-schemas.ts`
- `packages/shared-types/src/generated/api-contract.ts`
- `apps/api/src/subscriptions/proof.service.spec.ts`
- `apps/api/src/service-requests/request-media.service.spec.ts`
- `apps/api/test/subscriptions.integration.spec.ts`
- `apps/api/test/http-e2e/payments.http.spec.ts`
- `apps/api/test/fake-prisma.ts`

## Verification

| Command | Result |
| --- | --- |
| proof service unit suite | 12/12 pass |
| request-media unit suite | 18/18 pass |
| subscriptions fake E2E | 22/22 pass |
| payments real-HTTP suite | 7/7 pass (including amount 99 EGP, idempotent retry, approval race) |
| subscriptions integration | 2/2 pass |
| full API suite | 52 files / 451 tests pass |
| HTTP E2E | 5 files / 37 tests pass |
| typecheck / lint | pass / 0 errors |

## Remaining L3 / related work

- `SEC-002` presigned upload size/orphan cleanup is still open: the S3 adapter
  does not sign `Content-Length`, and rejected proof objects are not deleted in
  every validation branch.
- No real S3/MinIO HTTP E2E exists; storage adapters remain stub-verified.
- The amount snapshot is now auditable, but the commercial policy for approving
  a transfer whose amount differs from the current plan price is still a
  product decision.
