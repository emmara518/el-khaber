# Admin RBAC matrix (V2.1)

Enforcement is **server-side only**. Hiding UI controls is a UX concern, not a
security boundary.

## Guard chain

1. `JwtAuthGuard` (global) authenticates the admin authority with the separate
   admin JWT secret/issuer/audience, then reloads the role and status from the
   database on every request (a stale token claim cannot preserve a revoked
   role).
2. `AdminRolesGuard` (global, runs after authentication) applies
   **default deny**:
   - a route with `@AuthKind('admin')` and no `@AdminRoles(...)` is rejected;
   - an authenticated admin whose role is not listed receives **403
     `FORBIDDEN`**;
   - accepted roles are never echoed in the response.

`apps/api/test/admin-rbac.e2e.spec.ts` scans every controller route and fails
CI if a new admin route is added without explicit role metadata.

## Roles

- `super_admin` — financial approvals, subscriptions/entitlement grants,
  payment configuration, plus every operational read.
- `operations_admin` — technician/merchant verification, service-request
  operations, operational notifications. No financial approvals or grants.
- `content_admin` — content moderation only (review removal), plus read-only
  metrics/reviews.
- `support_admin` — limited read-only support (users, technicians, merchants,
  requests, reviews, payment queue). No mutations, no proof images, no
  financial decisions.
- `finance_admin` — legacy enum value. It has **no privileged route** in V2.1;
  only `/admin/me` remains accessible. Financial authority is `super_admin`
  only.

## Matrix

| Capability | Endpoint(s) | super | operations | content | support |
| --- | --- | :---: | :---: | :---: | :---: |
| Dashboard metrics | `GET /admin/metrics` | ✅ | ✅ | ✅ | ✅ |
| Users list/detail | `GET /admin/users`, `GET /admin/users/:id` | ✅ | ✅ | — | ✅ |
| Technicians list | `GET /admin/technicians` | ✅ | ✅ | — | ✅ |
| Technician verification | `POST /admin/technicians/:id/verification` | ✅ | ✅ | — | — |
| Merchants list | `GET /admin/merchants` | ✅ | ✅ | — | ✅ |
| Merchant verification | `POST /admin/merchants/:id/verification` | ✅ | ✅ | — | — |
| Service requests list | `GET /admin/service-requests` | ✅ | ✅ | — | ✅ |
| Request status / assignment | `POST /admin/service-requests/:id/status`, `/assign` | ✅ | ✅ | — | — |
| Reviews list | `GET /admin/reviews` | ✅ | ✅ | ✅ | ✅ |
| Review removal | `POST /admin/reviews/:id/remove` | ✅ | — | ✅ | — |
| Audit log read | `GET /admin/audit-logs` | ✅ | ✅ | — | — |
| Payment destinations | `GET/PUT /admin/payments/config` | ✅ | — | — | — |
| Payment submissions read | `GET /admin/payments/submissions[/:id]` | ✅ | ✅ | — | ✅ |
| Payment approve/reject | `POST /admin/payments/submissions/:id/approve`, `/reject` | ✅ | — | — | — |
| Payment proof image | `GET /admin/payments/submissions/:id/proof-url` | ✅ | ✅ | — | — |
| Manual subscription grant | `POST /admin/subscriptions/grant` | ✅ | — | — | — |
| Manual entitlement grant | `POST /admin/entitlements/grant` | ✅ | — | — | — |
| Operational notification | `POST /admin/notifications` | ✅ | ✅ | — | ✅ |
| Own admin identity | `GET /admin/me` | ✅ | ✅ | ✅ | ✅ |

## Sensitive decisions

Payment approval/rejection and manual grants write an audit row in the same
database transaction as the state change (actor admin id, action, entity,
reason/note, timestamp). See `A1` requirements in the V2.1 tracker.
