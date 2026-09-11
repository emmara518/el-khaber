# الخبير — API Contract

**Path:** `docs/07_API.md`
**Version:** 1.0
**Status:** API baseline

---

## 1. API principles

- Secure by default.
- Authenticated endpoints validate both identity and authorization.
- Consistent JSON response model unless a file/binary response is required.
- Validation errors are explicit.
- Pagination for list endpoints.
- Resource ownership is checked server-side.
- No client-controlled derived business metrics.

---

## 2. Base route policy

Suggested:

```text
/api/v1
```

If the current project uses another convention, preserve it and record the mapping.

---

## 3. Standard response envelope

Recommended success shape:

```json
{
  "data": {},
  "meta": {}
}
```

Recommended error shape:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human-readable message",
    "fields": {}
  }
}
```

Do not expose stack traces or internal exception details in production.

---

## 4. Authentication endpoints

### POST `/auth/register`
Purpose: create a new user account.

Request concept:
```json
{
  "role": "customer|technician|merchant",
  "phone": "...",
  "password": "..."
}
```

Rules:
- Role must be one of the three allowed application roles.
- Server validates role eligibility.
- Registration may require extra profile information depending on role.

### POST `/auth/login`
Authenticates account.

### POST `/auth/refresh`
Refreshes session/token according to auth architecture.

### POST `/auth/logout`
Ends session.

### POST `/auth/forgot-password`
Starts recovery.

### POST `/auth/reset-password`
Completes password reset.

---

## 5. Current-user endpoints

### GET `/me`
Returns current authenticated user + role + key profile metadata.

### PATCH `/me`
Updates allowed shared account fields. Authenticated user only; the user
ID is taken from the verified access token, never from the payload.

Allowed fields (Task 10C contract detail):

```json
{
  "phone": "+966501234567",
  "email": "user@example.com"
}
```

- At least one of `phone` / `email` is required; absent fields are unchanged.
- `role`, `status`, verification flags, and credentials are NOT writable.
- Changing a contact channel resets that channel's verification flag.
- A contact channel already used by another account returns `409 CONFLICT`.

Response: `{ "data": MeDto }`.

### GET `/me/subscription`
Returns current plan and active entitlements.

---

## 6. Customer endpoints

### GET `/appliance-categories`
Lists active appliances.

### GET `/faults`
Filters:
- `appliance_category_id`
- `q`
- pagination

### GET `/faults/:id`
Returns full fault-guide content.

### GET `/services`
Returns approved service categories.

### GET `/technicians`
Suggested query params:
- `q`
- `appliance_category_id`
- `service_id`
- `fault_id`
- `lat`
- `lng`
- `radius`
- `rating_min`
- `availability`
- `sort`
- `page`
- `limit`

Server controls the maximum limit.

### GET `/technicians/:id`
Returns public profile data allowed for discovery.

### GET `/technicians/:id/reviews`
Paginated reviews.

Implementation notes (Task 10E):

- All §6 catalog/content reads are PUBLIC. List endpoints are paginated
  (page/limit, server max 100) with the §19 meta (`total`, `totalPages`,
  `hasNext`).
- Fault Guide: only `published` faults are customer-visible; draft/review/
  archived content returns the same `404 NOT_FOUND` as a missing resource
  (moderation state is never exposed). Guidance content is served verbatim
  and is advisory by contract — the system does not generate diagnoses.
- Technician discovery: only `verified` technicians are publicly listed or
  detailed (missing ≡ unverified ≡ suspended → identical `404`). A listed
  technician must offer at least one active service. `availability` accepts
  the database enum values (`available`, `busy`, `unavailable`). `sort`
  accepts only `rating` (a ranking signal documented in 06 §10); the list
  orders by rating (nulls last, stable id tiebreak). Pricing and private
  data (user ids, contact channels) are not exposed.
- Geo parameters (`lat`, `lng`, `radius`) are documented but NOT
  implemented: the service-area SCHEMA foundation exists as of Task
  10E-R1 (`technician_service_areas`, geography(Point,4326), GiST), but
  exact radius/area query semantics (units, ordering, area-text matching,
  public exposure of area labels) are not yet defined — GEO QUERY
  SEMANTICS REQUIRE CTO DECISION. No geo behavior has been invented.

---

## 7. Service request endpoints

### POST `/service-requests`
Creates a request.

Conceptual payload:

```json
{
  "technician_id": "...",
  "appliance_category_id": "...",
  "service_id": "...",
  "fault_id": "...",
  "problem_title": "...",
  "problem_description": "...",
  "location_id": "...",
  "scheduled_at": "..."
}
```

`problem_title` is OPTIONAL (Task 10B CTO decision 2).

Implementation notes (Task 10F):

- All routes are authenticated; `customer_id` and the acting identity come
  from the verified JWT — never from the payload. Cross-account reads and
  mutations return the same `404 NOT_FOUND` as a missing request.
- `technician_id` targets a VERIFIED technician and is required; the
  request is created with status `pending` and an initial history record
  (∅ → pending). `location_id` must reference a location OWNED by the
  authenticated customer.
- `GET /service-requests` is role-scoped: customers see their own
  requests; technicians see pending requests targeted at them plus every
  non-pending request assigned to them. `status` filters the documented
  lifecycle values; pagination uses §19 (max 100).
- `GET /service-requests/:id` returns role-appropriate details including
  the request location (owner + targeted/assigned technician) and the
  append-only status history (bounded to the last 50 records).
- Transition routes map onto the §22 chain as follows: `accept`
  (pending → accepted), `start` (accepted → on_the_way, then
  on_the_way → in_progress — the two activation steps of the documented
  chain), `complete` (in_progress → completed), `reject` (technician:
  pending/accepted → cancelled), `cancel` (customer owner:
  pending/accepted → cancelled). No rejection-reason taxonomy exists.
- `POST /service-requests/:id/confirm` is not implemented: it is
  conditional in this document ("when a confirmation state is required")
  and the canonical state chain defines no confirmation state.
- Every mutation is a single atomic write guarded by the expected current
  status + actor scope (PostgreSQL row locking); the loser of a race
  receives `409 INVALID_STATE_TRANSITION` with no second mutation. Status
  writes and history records share one transaction.

Server calculates/validates anything derived.

### GET `/service-requests`
Customer sees own requests.
Technician sees eligible/assigned requests according to policy.

### GET `/service-requests/:id`
Returns authorized details.

### POST `/service-requests/:id/confirm`
Confirms customer intent when the product requires a confirmation state.

### POST `/service-requests/:id/accept`
Technician action if acceptance is part of the approved flow.

### POST `/service-requests/:id/reject`
Technician action if rejection is enabled.

### POST `/service-requests/:id/start`
Allowed actor only.

### POST `/service-requests/:id/complete`
Allowed actor only; server validates current state.

### POST `/service-requests/:id/cancel`
Allowed according to cancellation rules.

---

## 8. Location endpoints

### POST `/locations`
Creates/updates user-owned location records when supported.

### GET `/locations`
Returns user-authorized locations.

### PATCH `/locations/:id`
Owner/Admin policy only.

---

## 9. Media endpoints

### POST `/media/upload`
Recommended flow:
1. validate type/size
2. authorize context
3. obtain signed upload or safe upload path
4. persist reference

Never accept arbitrary public file URLs as trusted storage.

---

## 10. Reviews endpoints

### POST `/service-requests/:id/review`
Creates a review after completed service.

Server checks:
- customer ownership
- request completed
- no duplicate review unless edit policy allows

### PATCH `/reviews/:id`
Optional, only if editing is approved. NOT IMPLEMENTED (Task 10H): no edit policy has been approved.

---

## 11. Chat endpoints

### GET `/service-requests/:id/conversation`
Returns authorized conversation.

### GET `/conversations/:id/messages`
Paginated message history.

### POST `/conversations/:id/messages`
Sends message.

Server checks:
- participant authorization
- rate limit
- content limits
- attachment validity

---

## 12. Notification endpoints

### GET `/notifications`
Paginated current-user notifications.

### POST `/notifications/:id/read`
Marks notification read.

### POST `/notifications/read-all`
Marks appropriate notifications read.

Implementation notes (Task 10H):

- Reviews: eligibility is the documented policy (request owner + completed
  status + one review per request). Tags must reference seeded review tags.
  The technician's ratingAverage/ratingCount are recomputed server-side on
  creation. GET `/technicians/:id/reviews` is public and exposes only
  rating, comment, tag labels, and createdAt � no customer identifiers.

- Chat: the conversation is 1:1 with the service request and is created
  lazily on first access (Tracking/Active Service ? Chat flow). Participants
  are the request's customer and targeted/assigned technician; membership is
  derived server-side from the request � conversation ids alone grant
  nothing. Messages are text-only (attachment types require storage) with
  content limits (1�2000 chars); sender identity is always the verified JWT
  subject; history is bounded and ordered newest-first. NO realtime: HTTP
  persistence/read/send only.

- Notifications: persistence + read APIs only � NO delivery provider
  (Expo/FCM/APNs/email/SMS are later platform decisions). `type` is an
  open string until product trigger types are ratified; read-state
  mutations are recipient-scoped and idempotent.

---

## 13. Favorites endpoints

### GET `/favorites`
### POST `/favorites`
### DELETE `/favorites/:id`

The server determines whether the target is favoritable.

---

## 14. Subscription endpoints

### GET `/subscription-plans?role=...`
Returns active plans for the current user role.

### POST `/subscriptions`
Initiates subscription activation.

### GET `/subscriptions/current`
Returns active/current subscription.

### POST `/subscriptions/:id/cancel`
Cancels renewal according to billing policy.

### POST `/subscriptions/:id/change-plan`
Upgrade/downgrade behavior. NOT IMPLEMENTED (Task 10I): upgrade/downgrade semantics are undefined (docs/08) � CTO decision required.

Implementation notes (Task 10I):

- MVP manual payment ONLY: instapay | vodafone_cash. Payment verification is
  ADMIN-authoritative; user submissions are never trusted. No gateway, no
  webhooks, no automatic verification.
- `GET /subscription-plans` returns ACTIVE plans for the JWT role (role-aware,
  paginated). Inactive plans never appear and can never be purchased or granted.
- `POST /subscriptions` creates a PENDING manual payment submission
  (plan_id + method + transfer_reference; optional typed proof_storage_key).
  The submission stays pending until an Admin approves/rejects it via
  `/admin/payments/submissions/:id/approve|reject`. Resubmission = a new
  submission (history immutable).
- Approval is one transaction: submission ? approved, ACTIVE subscription
  created (PROVISIONAL 30-day period � docs/08 defines no durations), audit
  record, and the user notification. Rejection never activates anything.
- `GET /subscriptions/current` / `GET /me/subscription` / `GET /me/entitlements`:
  identity from JWT. Effective entitlements = active plan entitlements ?
  ADMIN manual grants. Inactive plans and expired periods yield nothing.
- Admin payment-destination config (`/admin/payments/config/:method`) is
  backend-managed and audited; disabled methods cannot be selected by users.
- Admin manual grants (`/admin/subscriptions/grant`, `/admin/entitlements/grant`)
  are audited and NEVER create payment records. An existing ACTIVE
  subscription blocks a new grant (409) � semantics pending CTO decision.

---

## 15. Entitlement endpoint

### GET `/me/entitlements`
Returns effective entitlements for the current user.

Example:

```json
{
  "data": {
    "entitlements": [
      "featured_visibility",
      "priority_support"
    ]
  }
}
```

The client may use this for display, but backend policies remain authoritative.

---

## 16. Technician endpoints

### GET `/technician/profile`
### PATCH `/technician/profile`
### GET `/technician/services`
### POST `/technician/services`
### DELETE `/technician/services/:id`
### GET `/technician/requests`
### GET `/technician/stats`

Stats must be server-derived.

---

## 17. Merchant endpoints

### GET `/merchant/profile`
### PATCH `/merchant/profile`
### GET `/merchant/products`
### POST `/merchant/products`
### PATCH `/merchant/products/:id`
### DELETE `/merchant/products/:id`

Implementation notes (Task 10G):

- All routes are merchant-only (`@Roles('merchant')`); the merchant profile
  is resolved from the JWT user — client-supplied merchant ids are never
  trusted. All resources are ownership-scoped: another merchant's products
  behave as missing (identical `404 NOT_FOUND`).
- `GET /merchant/profile` returns `404` until the merchant PATCHes —
  PATCH is the onboarding persistence: it creates the profile when absent
  (`verificationStatus: pending`) and updates otherwise. Writable fields:
  `businessName`, `bio`, `logoUrl`, `contactPhone`, `locationId` (must be a
  location OWNED by the merchant). `verificationStatus` is READ-ONLY —
  docs/09_ADMIN.md makes admin the sole verification authority and no
  merchant verification-mutation endpoint exists.
- Products: `POST` derives `slug` from `nameAr` when absent (unique per
  merchant); an explicitly provided duplicate slug → `409 CONFLICT`.
  `PATCH` accepts a whitelist (`nameAr`, `slug`, `descriptionAr`, `price`,
  `stockQuantity`, `imageUrl`, `status`) with an ownership-scoped atomic
  write; `merchantId`/`id` are immutable; an invalid status value is a
  `400 VALIDATION_ERROR` (transitions active↔suspended are unconstrained
  by this contract). `DELETE` (documented above) permanently removes the
  product. `price` stays nullable — no currency/discount/tax semantics.
- Product list supports §19 pagination only — search/category/status
  filters are not documented for this route and were not invented.
- No checkout/orders/payments/settlement/inventory behavior exists beyond
  the documented `price`/`stockQuantity` fields.

Marketplace order endpoints should be added only if that transaction model is explicitly approved.

---

## 18. Admin endpoints

Admin routes should be namespaced and protected, e.g.:

```text
/admin/users
/admin/technicians
/admin/merchants
/admin/appliances
/admin/faults
/admin/services
/admin/service-requests
/admin/reviews
/admin/subscriptions
/admin/notifications
/admin/content
/admin/audit-logs
```

See `09_ADMIN.md`.

---

## 19. Pagination standard

Recommended:

```text
?page=1&limit=20
```

Response metadata should include enough information to continue paging.

Do not allow client-provided `limit` above a safe server maximum.

---

## 20. Filtering and sorting

Whitelist sortable/filterable fields.

Never pass arbitrary database field names from the client directly into query construction.

---

## 21. Error codes

Suggested canonical codes:

```text
AUTH_REQUIRED
AUTH_INVALID
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
CONFLICT
RATE_LIMITED
SUBSCRIPTION_REQUIRED
ENTITLEMENT_REQUIRED
INVALID_STATE_TRANSITION
UPLOAD_REJECTED
INTERNAL_ERROR
```

---

## 22. State transition rules

For service requests, examples:

```text
pending → accepted
accepted → on_the_way
on_the_way → in_progress
in_progress → completed
pending/accepted → cancelled (if policy permits)
```

Actual enum must be centralized and validated.

Never permit:
```text
completed → pending
```
without an explicitly supported administrative correction flow.

---

## 23. API security checklist

- Auth on protected endpoints.
- Role and ownership checks.
- Request schema validation.
- Rate limiting where needed.
- File validation.
- Pagination limits.
- No internal error leakage.
- No client-trusted totals.
- Audit sensitive admin changes.

---

## 24. Backward compatibility

Do not silently remove fields used by existing clients.

For breaking API changes:
- version or migrate safely,
- update mobile/web clients together where possible,
- test old/new behavior if required.

---

## 25. API change rule

Any API contract change requires updates to:
- this file,
- relevant types/schemas,
- tests,
- client integration.

Do not change backend response shapes casually just to make one screen easier.

---

## 26. Operational endpoints

Implemented and documented as of Task 10C. Both are public (no auth).

### GET `/health`
Liveness probe. Process-level only — it must NOT depend on the database.

Response `200`:
```json
{ "data": { "status": "ok", "service": "api" } }
```

### GET `/ready`
Readiness probe. Verifies required dependencies (currently: database
connectivity).

Response `200`:
```json
{ "data": { "status": "ready", "checks": { "database": "ok" } } }
```

If a dependency is unavailable: `503` with the canonical error envelope
(`INTERNAL_ERROR`, message `Service not ready`, `fields` carrying the
dependency detail).

---

## 27. Admin authentication

Admin is a separate authority boundary (docs/09_ADMIN.md). Admin accounts
are seeded/created out-of-band; there is no public admin registration.
All routes are rate-limited like the user auth endpoints.

### POST `/admin/auth/login`
Email + password. Returns `{ "data": AuthSessionDto }` (200). Invalid
credentials → `401 AUTH_INVALID`.

### POST `/admin/auth/refresh`
Rotates the admin refresh token (opaque token in body). Reuse/replay of a
rotated token revokes the whole family and returns `401`.

### POST `/admin/auth/logout`
Revokes the admin refresh-token family. Returns `204`.

### GET `/admin/me`
Bearer admin access token. Returns the admin identity (safe DTO; admin
roles are separate from the three end-user roles).

---

## 28. Request correlation

Every response carries an `X-Request-Id` header. Clients may send their own
`X-Request-Id` (8–64 chars of `[A-Za-z0-9._-]`); unsafe or missing values
are replaced server-side with a generated UUID. The request ID is included
in structured server logs. It is intentionally NOT part of the canonical
error envelope.

---

## 29. Failed-login protection

Implemented as of Task 10D for `POST /auth/login` and
`POST /admin/auth/login`.

- Bounded failures → temporary lock → automatic expiry. There is NO
  permanent lockout and no manual unlock flow.
- The counter is scoped to the (identifier, ip) pair, so a third party
  cannot lock a victim out of their own account.
- A locked attempt is rejected with the SAME `401 AUTH_INVALID` response
  as a wrong password — the lock state must never reveal which accounts
  exist. Legitimate users simply retry after the lock expires.
- Thresholds are environment-configurable (`AUTH_MAX_FAILED_LOGINS`,
  `AUTH_FAILURE_LOCK_SECONDS`) and are PROVISIONAL pending CTO
  ratification; no thresholds were previously documented.
- Enforcement is in-memory per API instance (same scaling limitation as
  the request throttler). Distributed enforcement is a production
  hardening item.

---

## 30. Password reset delivery boundary

`POST /auth/forgot-password` issues a one-time, hashed, expiring reset
token exactly as specified in §4. The raw token is handed only to an
internal, provider-agnostic delivery port (Task 10D §4).

- No email/SMS/push provider is approved yet; the default delivery
  implementation is a deferred no-op that never logs or stores the token
  and never claims a message was delivered.
- The raw token is never included in any HTTP response, log line, or
  persistence record (only its SHA-256 hash is stored).
- Selecting and approving a real delivery provider is a CTO decision.
