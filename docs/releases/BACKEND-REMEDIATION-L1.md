# Backend Remediation — L1 Authentication & Reset Safety

**Date:** 2026-10-24  
**Repository HEAD:** `b63354f748bdee1c28cf79f8476f5bed97680810`  
**Audit baseline:** `docs/19_BACKEND_DATABASE_READINESS_AUDIT.md` (release `739f9eb`)  
**State:** changes are in the working tree; not committed, pushed, merged, or deployed.

## Scope and result

L1 targeted `AUTH-001`, `AUTH-004`, `AUTH-005`, plus the related lockout, logout,
delivery-transport, cache, and route-metadata findings.

| Finding | Result | Evidence |
| --- | --- | --- |
| `AUTH-001` email change + reset takeover | **CLOSED (code + real HTTP)** | Current-password proof, pending-email state, one-time verification token, reset blocked until verified |
| `AUTH-004` reset-token single-use race | **CLOSED** | Atomic conditional claim inside the password-change transaction |
| `AUTH-002` user/admin lockout namespace | **CLOSED** | Scoped keys `user:` / `admin:`; unit regression |
| `AUTH-006` refresh families after global logout | **CLOSED** | Logout revokes every family for the user/admin |
| `AUTH-005` lost reset delivery | **NOT CLOSED — explicitly out of production scope** | Live delivery remains #27; no durable outbox was introduced |
| `AUTH-003` registration enumeration | **OPEN — product/API decision** | Duplicate registration still returns a distinct 409 |
| `SEC-003` auth cache headers | **CLOSED** | `Cache-Control: no-store`, `Pragma: no-cache` |
| `SEC-004` proof route metadata | **CLOSED** | Explicit three end-user roles on proof endpoints |
| Reset delivery HTTPS | **CLOSED** | Production factory rejects non-HTTPS delivery URL |

## Implementation

### Email change and verification

- `PATCH /me` now requires `current_password` when the email changes. Missing
  password → 400; wrong password → 401.
- The new address is stored with `email_change_pending=true` and
  `email_verified=false`.
- A one-time `email_verification_tokens` row is created; only its SHA-256
  hash is stored. The raw token goes only to the delivery adapter.
- `POST /auth/verify-email` consumes the token atomically and sets
  `email_verified=true`, `email_change_pending=false`.
- `forgot-password` refuses to issue a reset token while the address is
  pending, while keeping the same 202 response for account enumeration.
- The delivery adapter now supports `email_verification` in addition to
  `password_reset`.
- Verification tokens are bound to the exact new address; changing email again
  invalidates the old link.

### Reset token atomicity

`consumeReset` now claims the token with:

```ts
updateMany({
  where: { id, usedAt: null, expiresAt: { gt: now } },
  data: { usedAt: now },
})
```

inside the same transaction as the password/tokenVersion update and refresh
family revocation. Only one concurrent request can claim the token.

### Lockout and session revocation

- `SharedStoreLoginAttemptGuard` takes an explicit `user|admin` scope and keys
  the pair, IP, and account buckets with that scope.
- Logout revokes every refresh family for the user (and admin), not only the
  presented family, matching the global tokenVersion revocation already used.

## Files

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20261022100000_email_change_verification/migration.sql`
- `packages/shared-validation/src/index.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/auth.controller.ts`
- `apps/api/src/auth/password-reset.service.ts`
- `apps/api/src/auth/password-reset-delivery.port.ts`
- `apps/api/src/auth/http-password-reset-delivery.ts`
- `apps/api/src/auth/auth.module.ts`
- `apps/api/src/me/me.controller.ts`
- `apps/api/src/admin/admin-auth.service.ts`
- `apps/api/src/common/rate-limit/shared-store-login-attempt.guard.ts`
- `apps/api/src/common/security-headers.middleware.ts`
- `apps/api/src/subscriptions/proof.controller.ts`
- `apps/api/test/http-e2e/auth-remediation.http.spec.ts`
- `apps/api/test/login-attempt.spec.ts`
- `apps/api/test/token-version.spec.ts`
- `apps/api/test/foundation.e2e.spec.ts`
- `apps/api/test/fake-prisma.ts`

## Verification

| Command | Result |
| --- | --- |
| `pnpm --filter @khabir/api typecheck` | pass |
| `pnpm --filter @khabir/api exec vitest run --exclude test/admin-payments-decisions.e2e.spec.ts` | **52 files / 451 tests pass** |
| `pnpm --filter @khabir/api test:http-e2e` | **5 files / 37 tests pass** |
| `pnpm --filter @khabir/api lint` | 0 errors (35 pre-existing import-order warnings) |
| `prisma migrate status` | 26 migrations, up to date |

The new real-HTTP test proves:

1. Email change without current password → 400.
2. Wrong current password → 401.
3. Correct password → pending state + verification token.
4. `forgot-password` does not issue a reset token while pending.
5. Verification token works once; reuse → 401.
6. After verification, reset issuance works.
7. Two concurrent reset requests → one 204, one 401; only one password works.
8. Global logout invalidates a second refresh family.
9. Auth responses carry `no-store` and `Pragma: no-cache`.

## Remaining L1 work

- **AUTH-005:** no durable outbox/retry. Live reset delivery remains blocked by
  #27 (provider/mailbox). This release explicitly keeps delivery out of
  production scope; do not claim it works in production.
- **AUTH-003:** registration/contact enumeration remains a product/API
  decision. A uniform registration response would change the current client
  contract.
- The verification email is sent on a best-effort basis after the email update;
  if delivery fails, the address remains pending and reset is still blocked.
  A resend endpoint/outbox remains part of #27.
