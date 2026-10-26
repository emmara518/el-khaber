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

WP-01: the response now includes `avatarUrl: string | null` — the
role-appropriate profile image (customer avatar, technician avatar,
merchant logo): a server-issued stable public URL, or `null` when
absent. It is never a storage key.

### PATCH `/me`

Updates allowed shared account fields. Authenticated user only; the user
ID is taken from the verified access token, never from the payload.

Allowed fields (Task 10C contract detail):

```json
{
  "phone": "+201001234567",
  "email": "user@example.com",
  "current_password": "current account password"
}
```

- At least one of `phone` / `email` is required; absent fields are unchanged.
- `role`, `status`, verification flags, and credentials are NOT writable.
- Changing a contact channel resets that channel's verification flag.
- Changing `email` requires `current_password` (400 if omitted, 401 if wrong).
  The new address is marked pending and password recovery is refused until
  `POST /auth/verify-email` consumes the one-time link sent to that address.
  This prevents a stolen access token from redirecting recovery mail.
- A contact channel already used by another account returns `409 CONFLICT`.

Response: `{ "data": MeDto }`.

### POST `/auth/verify-email`

Body: `{ "token": "<one-time token>" }`. Consumes the pending email-change
link exactly once; a later email change invalidates the old link. Returns
`{ "data": { "verified": true } }`, or `401 AUTH_INVALID` for expired/reused
or stale links.

### POST `/me/avatar` (WP-01, customer only)

Multipart upload (`file` field, single image ≤ 2MB: JPEG/PNG/WebP) of
the caller's own profile photo. The server validates magic bytes,
decodes with sharp (≤ 2048px longest side), re-encodes (EXIF stripped),
stores under server-generated `avatars/{userId}/{uuid}.{ext}` in the
dedicated public avatar bucket, and persists the public URL on the
customer profile. Response: `{ "data": { "avatarUrl": "<publicUrl>" } }`
(`201`). Failures: `400 UPLOAD_REJECTED` (missing/fake file),
`413 UPLOAD_REJECTED` (oversize), `429 RATE_LIMITED` (anti-flood),
`401` (non-customer).

### DELETE `/me/avatar` (WP-01, customer only)

Idempotent removal (`204` always, even when no photo exists). The
reference is NULLed first; the owned object delete is best-effort
(failures are warn-logged + audited for the orphan cleanup, never
surfaced). Legacy foreign URLs are never deleted (not ours).

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

Supported query params (all enforced server-side):

- `q` (name/bio text search)
- `appliance_category_id`
- `service_id`
- `fault_id` (via the fault→service catalog links)
- `rating_min` (decimals allowed, e.g. 4.5)
- `availability`
- `area` (service-area LABEL containment, NOT geo — see below)
- `sort` (`rating` only; fixed rating ordering regardless)
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
  data (user ids, contact channels) are not exposed. The public DTO
  includes `areasAr` (service-area labels) and `avatarUrl`.
- Service-area matching (WP-Discovery): `area` matches technician
  `serviceAreas.labelAr` by case-insensitive containment (a selected
  district matches labels containing it). This is LABEL semantics, NOT
  geography: coordinates stay write-only on the technician profile and
  are never queried for discovery; no `lat`/`lng`/`radius` params exist.
  No coordinates were invented and no tracking was added.

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
- `scheduled_at` is an OPTIONAL **preferred visit time**, never a booking:
  no availability engine or slot inventory exists (Track B1). When present
  the server requires a future timestamp at most 14 days ahead and stores
  it as the customer's preference; the technician confirms the visit by
  phone. Clients must label it as a preference, not a confirmed
  appointment.
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

Implementation notes (Task REM-001):

- `GET /locations`, `POST /locations`, and `PATCH /locations/:id` are
  implemented. All routes are authenticated and restricted to
  `customer | merchant` (technicians use service areas, not locations).
- Ownership comes from the verified JWT. Another account's location
  behaves as missing (identical `404`); cross-account `PATCH` is `404`.
- Writable fields: `label` (required, 1–128), `address_text`, `city`,
  `region`, `country`, and `latitude`/`longitude` (which must be supplied
  together). **Coordinates are OPTIONAL** — docs/06 §6 says "store exact
  coordinates only when required"; no map/geocoding provider is approved,
  so label/address-only locations are valid. An explicit JSON `null`
  coordinate is treated as omitted (never coerced to `0`). This is what
  makes the customer service-request journey executable (a request
  requires an owned `location_id`).
- No `DELETE` endpoint: deletion semantics are not documented.

---

## 9. Media endpoints

### POST `/media/upload`

Recommended flow:

1. validate type/size
2. authorize context
3. obtain signed upload or safe upload path
4. persist reference

Never accept arbitrary public file URLs as trusted storage.

Implementation status (Task 10L / REM-002, updated PHASE 20 / Track B2):
object storage is now implemented on the provider-abstracted `StoragePort`
(S3-compatible presigned URLs; the local adapter is a dev/test double only).
Supabase Storage remains out of scope per ADR-0004. The generic
`POST /media/upload` route still does not exist: uploads are request-scoped
and follow the grant → PUT → confirm proof pattern.

- Payment proofs (PHASE 20): `POST /subscriptions/payments/proof-upload-url`,
  `POST /subscriptions/payments/:id/proof`, `GET /admin/payment-submissions/:id/proof-url`.
- Service-request photos (Track B2): the four endpoints below.

### POST `/service-requests/:id/media/upload-url`

Customer owner only. Body: `{ mime_type }` (`image/jpeg|image/png|image/webp`).
Returns `{ requestId, storageKey, uploadUrl, requiredHeaders, mimeType,
maxBytes, expiresInSeconds }`. The key is generated server-side under
`request-media/{userId}/{requestId}/`; clients cannot choose it. The request
must be open (not `cancelled`); over the per-request cap → 409 `CONFLICT`.

### POST `/service-requests/:id/media/confirm`

Customer owner only. Body: `{ storage_key }`. Head-verifies the object, then
checks declared size, allowlisted MIME, and magic bytes before persisting the
`ServiceRequestMedia` row. Invalid objects → 400 `UPLOAD_REJECTED`; a rejected
object is deleted best-effort (no orphan). Response 201:
`{ id, mimeType, fileSize, createdAt }`.

### GET `/service-requests/:id/media`

Participants only (owner customer + targeted/assigned technician). Returns up
to 50 items `{ id, mimeType, fileSize, createdAt }` ordered by creation. Storage
keys are never exposed. Merchant/stranger → 404.

### GET `/service-requests/:id/media/:mediaId/url`

Participants only. Returns `{ mediaId, downloadUrl, expiresInSeconds }` with a
short-lived presigned GET; every view is audited
(`user.service_request.media_view`).

---

## 10. Reviews endpoints

### POST `/service-requests/:id/review`

Creates a review after completed service.

Server checks:

- customer ownership
- request completed
- no duplicate review unless edit policy allows

### GET `/review-tags`

Public. Returns the canonical **active** review tags as `[{ "id", "labelAr" }]`,
ordered deterministically by `code`. The UUID is the canonical identifier;
clients submit `tag_ids` (UUIDs) on review creation and must not hardcode tag
labels (docs/06 §14). Added WP-2C.

### PATCH `/reviews/:id`

Optional, only if editing is approved. NOT IMPLEMENTED (Task 10H): no edit policy has been approved.

---

## 11. Chat endpoints

One shared chat domain. A conversation is scoped to EITHER a service request
(participants = the request customer + the assigned/targeted technician) OR a
product (participants = the initiating customer/technician + the merchant who
owns the product). There are no arbitrary user-to-user conversations.
`Message.readAt` backs server-authoritative unread counts; opening a
conversation marks the peer's messages read. No realtime: HTTP only.

Client polling contract (V2.1): the mobile client polls this history only while
the chat screen is visible and the app is in the foreground — at most one
request in flight, every **15 seconds**. Polling is the only throttle here: the
endpoint has no rate limit beyond authentication, and each GET also performs
the read-mark UPDATE.

### GET `/service-requests/:id/conversation`

Returns the authorized service-request conversation (lazily created on first
access; participants derived server-side from the request).

### GET `/products/:id/conversation`

Phase D. Customer/technician only. Returns (or lazily creates) the caller's
conversation with the merchant who owns the ACTIVE product. Idempotent per
`(product, initiator)`. Merchants initiating here receive an identical 404.

### GET `/conversations`

Unified inbox (WP-Inbox; all roles). Paginated (`page`/`limit` + `meta`,
newest activity first). Each item carries the real peer identity
(`peerNameAr`: technician displayName / merchant businessName / generic
customer label — never invented; `peerAvatarUrl`: public profile image
or null), the real latest message (`lastMessageAr` + `lastMessageAt`,
null when none), the server-authoritative `unreadCount`, and the thread
context (`contextTitleAr`: order title or product name). Listing never
creates conversations. Participant-scoped: a caller only ever sees
their own.

### GET `/conversations/:id/messages`

Paginated message history. Opening the conversation marks incoming messages
read for the caller (unread counts stay truthful).

### POST `/conversations/:id/messages`

Sends a message.

Server checks:

- participant authorization (service conversations by request membership;
  product conversations by participant row) — enforced server-side, IDOR-safe
- sender identity is always the verified JWT subject (never the payload)
- rate limit
- content limits
- attachment validity

---

## 12. Notification endpoints

### GET `/notifications`

Paginated current-user notifications.

### GET `/notifications/unread-count`

Server-authoritative unread count (`{ unread }`) for the badge —
no full list drain required.

### GET `/notifications/preferences`

Own delivery preferences (`{ requestStatus, subscription }`, both
booleans). Absent row ≡ all `true` (defaults ON).

### PUT `/notifications/preferences`

Replaces own delivery preferences (both keys required; unknown keys
stripped). `verification` decisions + admin operational messages are
MANDATORY and have no key — they cannot be disabled.

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
- Notification triggers (Task 10M): approved business events persist a
  notification server-side in the SAME transaction as the state mutation
  (atomic — a failed action never emits a phantom notification). Service
  request transitions (`request_status`) notify the counterparty: the
  customer for technician actions (accept/on_the_way/in_progress/completed/
  cancelled) and the assigned technician for a customer cancellation.
  Subscription activation (payment approval or admin manual grant),
  cancellation-of-renewal (exactly once), and manual entitlement grants
  notify the plan owner (`subscription`). Admin operational notifications
  remain recipient-validated and Admin-JWT-authoritative. Recipients,
  type, and content are always derived server-side.
- WP-Notifications: every business notification carries a navigation
  `dataJson` with ids only (`serviceRequestId`, `subscriptionId`,
  `submissionId`, `profileId`, …) — never PII. `request_status` and
  `subscription` families are preference-gated at WRITE time (suppressed
  when the recipient disabled them; the business state still commits).
  `verification` + admin operational messages are MANDATORY and bypass
  preferences. The unread badge reads `GET /notifications/unread-count`;
  preferences live at `GET|PUT /notifications/preferences`.

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
  (plan_id + method + transfer_reference). The server snapshots the plan's
  `amount` and `currency` onto the submission; later plan-price changes do
  not rewrite history. `(user_id, plan_id, transfer_reference)` is unique,
  so a retry returns the existing pending submission instead of creating a
  duplicate; a reviewed duplicate returns `409`. `proof_storage_key` is NOT
  accepted on creation (400) — proof attaches post-creation through the
  proof endpoints below. The submission stays pending until an Admin
  approves/rejects it via
  `/admin/payments/submissions/:id/approve|reject`.
- WP-Proof — payment proof attach flow (private S3 bucket, never the
  public avatar bucket): `POST /subscriptions/:id/proof-upload-url`
  `{mime_type}` → server-generated key + presigned PUT → client PUTs
  the bytes → `POST /subscriptions/:id/proof-confirm` `{storage_key}`
  (server validates MIME/size/magic + ownership, then binds). Only the
  owner, only while pending (`404` cross-account, `409` reviewed).
- Approval is one transaction: submission ? approved, ACTIVE subscription
  created (PROVISIONAL 30-day period — docs/08 §20), audit record, and the
  user notification. Rejection never activates anything. WP-7: approval
  requires that the user has NO other effective active subscription, else
  `409 CONFLICT` (no stacking / no replacement).
- WP-7 expiry: an overdue active subscription (`currentPeriodEnd <= now`)
  is PERSISTED as `expired` when the lifecycle is evaluated (current reads
  or admin activation). Effective-entitlement calculation never treats an
  expired subscription as active. No scheduler, no expiry notification.
- `POST /subscriptions/:id/change-plan` is NOT implemented (WP-7 D4).
- `GET /subscriptions/current` / `GET /me/subscription` / `GET /me/entitlements`:
  identity from JWT. Effective entitlements = active plan entitlements ∪
  ADMIN manual grants. Inactive plans and expired periods yield nothing.
  WP-7 D1: no plan grants entitlements in MVP (the catalogue is placeholder
  data); entitlements are not surfaced in the mobile UI (D7).
- Admin payment-destination config (`/admin/payments/config/:method`) is
  backend-managed and audited; disabled methods cannot be selected by users.
- Admin manual grants (`/admin/subscriptions/grant`, `/admin/entitlements/grant`)
  are audited and NEVER create payment records. WP-7 D3: exactly one
  effective active subscription per user — a new subscription grant while
  one is active returns `409 CONFLICT` (the same rule as approval).

---

## 15. Entitlement endpoint

### GET `/me/entitlements`

Returns effective entitlements for the current user.

Example:

```json
{
  "data": {
    "entitlements": ["featured_visibility", "priority_support"]
  }
}
```

The client may use this for display, but backend policies remain authoritative.

---

## 16. Technician endpoints

### GET `/technician/profile`

### PATCH `/technician/profile`

### POST `/technician/profile/avatar` (WP-01, technician only)

### DELETE `/technician/profile/avatar` (WP-01, technician only)

### GET `/technician/services`

### POST `/technician/services`

### DELETE `/technician/services/:id`

### GET `/technician/requests`

### GET `/technician/stats`

Implementation notes (WP-4 availability):

- `PATCH /technician/profile` also accepts `availability_status`, restricted to
  `available | unavailable` (`busy` is reserved and rejected with
  `400 VALIDATION_ERROR`). The technician controls it manually; it persists
  until changed (no expiry, no schedule). The written value is
  `technician_profiles.availability_status`.
- `GET /technicians?availability=available` filters technician discovery
  **server-side** using the same stored value; rating ordering and pagination
  are unchanged. The public `TechnicianPublicDto.availabilityStatus` is the
  server state (`available | unavailable | busy`).

Stats must be server-derived.

Implementation notes (WP-01 avatars):

- Profile photos change exclusively through multipart
  `POST /technician/profile/avatar` (same contract as
  `POST /me/avatar`: single image ≤ 2MB, magic + sharp validation,
  EXIF stripped, server-generated `avatars/{userId}/{uuid}.{ext}`,
  `201 { "data": { "avatarUrl": "<publicUrl>" } }`) and idempotent
  `DELETE /technician/profile/avatar` (`204`). `avatar_url` was removed
  from the `PATCH /technician/profile` schema — text PATCH can no
  longer inject external URLs (legacy stored values keep reading back).

---

## 17. Merchant endpoints

### GET `/merchant/profile`

### PATCH `/merchant/profile`

### POST `/merchant/profile/logo` (WP-01, merchant only)

### DELETE `/merchant/profile/logo` (WP-01, merchant only)

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
  `businessName`, `bio`, `contactPhone`, `locationId` (must be a
  location OWNED by the merchant). `verificationStatus` is READ-ONLY —
  docs/09_ADMIN.md makes admin the sole verification authority and no
  merchant verification-mutation endpoint exists.
- WP-01: `logoUrl` was removed from the PATCH schema. Store logos change
  exclusively through multipart `POST /merchant/profile/logo`
  (`201 { "data": { "logoUrl": "<publicUrl>" } }`) and idempotent
  `DELETE /merchant/profile/logo` (`204`) — same image contract as the
  customer/technician avatar endpoints. Legacy stored values keep
  reading back.
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

Implementation notes (WP-5):

- The merchant's city/locality persists through the **existing** location
  model: an owned `Location` (`label` = the selected city) is referenced by
  `merchant_profiles.location_id` (`/locations` allows `customer | merchant`,
  §8); the profile readback resolves the location label. No new geo model.
- Product `imageUrl` is the existing `products.image_url` field; the client
  now sends it (optional URL). There is **no** upload/storage path.
- The product model has **no** category field; the client's former category
  control was removed rather than inventing a taxonomy.
- `DELETE /merchant/products/:id` (documented above) is exposed in the
  merchant client: owner-only, confirmed, then removed from local state on
  server confirmation.

Marketplace order endpoints should be added only if that transaction model is explicitly approved.

---

## 17A. Public store product reads (Phase D)

The customer/technician store reads the SAME merchant products through a
public read contract (no merchant-management privileges).

### GET `/products`

Public. Paginated list of ACTIVE products, newest first.

### GET `/products/:id`

Public. Active product detail. A missing product and a suspended product
return the identical `404 NOT_FOUND`.

Visibility semantics: only products with `status = active` are exposed
(reusing the existing `active | suspended` lifecycle — no approval/moderation
system). A merchant-created product is therefore publicly readable while
active.

Response model `PublicProductDto` (minimal, no internal fields):
`id`, `nameAr`, `slug`, `descriptionAr`, `price` (nullable, implicit EGP),
`imageUrl` (nullable), `merchant: { businessNameAr }` (nullable). Inventory
(`stockQuantity`), the internal `merchantId`, `status`, and timestamps are
deliberately NOT exposed.

Notes:

- Customer and Technician MUST NOT use the `/merchant/products*` management
  routes; those remain merchant-JWT-scoped (non-merchant → `401`).
- No checkout/order/payment behavior is implied by the store read.

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
/admin/plans
/admin/entitlements
/admin/notifications
/admin/content
/admin/audit-logs
```

See `09_ADMIN.md`.

Implementation notes (WP-Admin-01…04):

- Every admin route requires the admin authority AND the calling
  admin's role (`@AdminRoles`, docs/09 §19 matrix) — enforced
  server-side against the database role. Status semantics:
  unauthenticated → `401`; authenticated but role not listed → `403`.
- Verification decisions (`POST …/verification {status, reason?}`):
  `reason` (4–500 chars) is REQUIRED for `rejected`/`suspended`,
  audited, and notified to the user. No KYC document store exists —
  the reviewable record is the profile itself.
- Technician assignment (`POST /admin/service-requests/:id/assign
{technician_id}`): pending requests only, verified technicians
  only, atomic, audited, both parties notified. This is an EXCEPTION path:
  the normal flow is the technician accepting the customer's request in
  the app; the UI labels it as an exceptional intervention.
- Grant catalogs (`GET /admin/plans`, `GET /admin/entitlements`):
  `super_admin` only. Return ACTIVE plans (`id, role, code, nameAr, price,
  currency, billingInterval`) and ACTIVE entitlements (`id, code, nameAr,
  featureGroup`) so the console can pick labels instead of raw UUIDs.
  Read-only; no audit entry, no mutation.
- Admin technician search (`GET /admin/technicians?q=`): matches the
  profile `displayName` OR the owner user's `email`/`phone` (verified
  filter still server-enforced).
- Review removal (`POST /admin/reviews/:id/remove {reason}`):
  irreversible hard delete, so `reason` (4–500 chars) is REQUIRED and
  audited; technician metrics are recomputed.
- Decision idempotence/ordering (verified behavior): approval checks
  "user has no other effective active subscription" BEFORE claiming the
  pending submission — so replaying an approval whose subscription
  already exists returns `409 User already has an active subscription`
  (not the stale-review message). Rejection claims
  pending→rejected first; for an unknown but well-formed id this yields
  `409 Payment submission has already been reviewed` while an unknown
  id on approve still reads `404` (this asymmetry is documented, not a
  contract change).
- Path-parameter validation: the global `UuidParamPipe`
  (`apps/api/src/common/uuid-param.pipe.ts`, registered APP_PIPE)
  treats a malformed (non-UUID) `:id` as "absent" and responds the
  generic `404 Not found` envelope before reaching the service.

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
