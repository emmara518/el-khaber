# الخبير — Release Candidate Manifest

**Path:** `docs/12_RELEASE.md`
**Status:** Final production-readiness run — strongest achievable candidate
given the environment. **NOT deployed. NOT merged to main.**

---

## 1. Release identity

| Field | Value |
|---|---|
| Branch | `review/final-production-release` |
| Base branch | `review/final-production-readiness` |
| Previous RC | `review/release-candidate-v3` @ `48bfcaaf5a6b109c0de1abb4ea81a422eacf7faa` |
| Release version | `0.0.1-rc.4` |
| API version | `0.0.1` (contract in `docs/api/openapi.yaml`) |
| Mobile version | `0.0.1` (Expo SDK 52, `ai.khabir.app`) |
| Admin web | `0.0.1` (Next.js) |
| Landing web | `0.0.1` (Next.js) |
| Database | managed PostgreSQL + PostGIS; **6 migrations** |

---

## 2. What this run changed (on top of RC3)

- **Admin console completed for the documented scope:** manual
  subscription/entitlement grants, operational notifications, and payment
  submission detail + approve/reject are now real UI surfaces; destructive
  actions confirm first; admin session handling fixed (refresh token
  persisted, expiry enforced, server-side logout revocation, single-retry
  silent refresh); admin JWT carries the truthful admin role.
- **API fixes:** admin list filters (`verification_status`, `entity_type`)
  now actually filter (explicit snake→camel mapping + E2E negative cases);
  `DIRECT_URL` fail-fast at startup; container `HEALTHCHECK` on `/health`.
- **Mobile fixes:** customer-home retry, merchant edit loading state,
  stale mock comments refreshed.
- **Android QA APK built** (debug, installable for QA — not a store
  artifact). Required a pinned `expo.modules` autolink import in the new
  `apps/mobile/react-native.config.js` (locked Expo 52.0.49 namespace
  mismatch, documented in-file).

### Deliberately NOT done
- No storage provider invented — payment proof stays blocked.
- No Android runtime installed — native QA stays unverified.
- No Redis/shared store installed — topology stays a CTO decision.
- No pricing, billing cadence, roles, or payment semantics invented.
- No keystore/EAS credentials invented — no signed AAB.

---

## 3. Verification summary

| Gate | Result | Evidence |
|---|---|---|
| Repo typecheck | PASS (11/11 packages) | `pnpm typecheck` |
| Repo lint | PASS (0 errors) | `pnpm lint` |
| API unit + e2e (in-memory) | PASS — 24 files / 187 tests | `pnpm --filter @khabir/api test` |
| Mobile tests | PASS — 27 files / 249 tests | `pnpm --filter @khabir/mobile test` |
| Real HTTP E2E (isolated `khabir_test`) | PASS — 3 files / 18 tests, RUN 1 + RUN 2 | `pnpm --filter @khabir/api test:http-e2e` |
| OpenAPI + generated types | deterministic | `pnpm gen:openapi`, `pnpm gen:types` |
| Migrations | additive, non-destructive (6 total) | `prisma/migrations` |
| khabir-dev residue | ZERO (all probe prefixes 0/0/0) | probe query |
| Android QA APK | BUILT (debug) — see §4 | `assembleDebug` + aapt2 badging |
| Live QA execution (API journeys, 42/42) | PASS | `scripts/api-qa-run.cjs` (§6a) |
| Admin console surfaces QA | PASS — 4 actions verified + audited | browser run (§6a) |
| Android emulator QA (login/browse/product) | PASS — happy paths | `khabir_qa` AVD (§6a) |
| Native QA execution | PASS on emulator (see §6a) | — |
| Payment proof | BLOCKED — no approved provider | — |

---

## 4. Android QA artifact

- **Path:** `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`
  (git-ignored build output — preserved in the workspace, not committed)
- **Filename:** `app-debug.apk`
- **Version:** `versionName 0.0.1` (`versionCode 1`), package `ai.khabir.app`,
  label `الخبير`, `minSdk 24`, `targetSdk 34`
- **SHA-256:** `F75D79D2371CDA506162548C857A24BA82768DF3A3CFF1D2D27EC23F53202616`
- **Build profile:** debug (debug-signed, installable for QA — **not** a
  Play Store artifact)
- **AAB:** not produced — requires release signing/EAS credentials that do
  not exist in this environment.

---

## 5. Database migration state

```text
20260101000000_init_identity
20260910000000_domain_foundation
20260911000000_technician_service_areas
20260912000000_payments_and_grants
20260913000000_technician_self_service
20260914000000_location_coordinates_optional
```

---

## 6. Known risks

- **P1:** Payment proof not operational (CTO storage-provider decision).
- **P1:** Rate-limit/lockout topology unapproved (single-instance only;
  logged at startup, documented, not enforced by infra).
- **P2:** No payment/subscription UI in Mobile (backend verified; blocked
  downstream of proof); placeholder tabs remain in technician/merchant
  navigation; photos step has no real picker (optional, never sent).
- **P2:** Admin plan/pricing management, notification
  audience/channel/scheduling, payment-destination config UI remain
  unimplemented (documented in `docs/09_ADMIN.md`).
- **P3:** Admin web is a functional console; missing `favicon.ico`;
  type-only imports from mock files (zero runtime effect).

---

## 6a. Live QA execution run — 2026-09-14/15 (final delivery QA)

Environment: local QA API on `:3100` (isolated `khabir_test`,
6 migrations applied + QA seed `scripts/seed-qa.mjs`), Android QA APK
installed on the `khabir_qa` emulator, admin web on `:3001`
(`NEXT_PUBLIC_API_URL=http://localhost:3100/api/v1`).

### Automated API journey (`scripts/api-qa-run.cjs`) — 42/42 PASS

Customer → technician → merchant full lifecycle executed against the
real HTTP API:

- Auth: login per role, wrong-password 401, unauthenticated `/me` 401.
- Catalog: categories, services, faults, technician discovery, locations.
- Service request lifecycle: create (pending) → technician accept →
  start (accepted → `on_the_way`) → start #2 (`in_progress`) →
  complete → customer review (rating 5) → technician stats reflect the
  review. Cancel path: second request cancelled; cancelling a completed
  request correctly rejected (409).
- Conversation: opened with the request, message sent by customer and
  read by technician.
- Technician self-service: profile, services, stats.
- Merchant: profile, products, subscription current, role-scoped plans
  (merchant sees zero customer plans), payments config (2 methods).
- Notifications: customer and technician received lifecycle events.

### Manual/Android + admin console QA

- Android QA APK launched on the `khabir_qa` emulator against the QA
  API: onboarding → role selection → login (customer, merchant) →
  customer profile with live order counts → merchant home shows account
  status «قيد المراجعة» (seeded pending) → product creation form submits
  and the product appears in «إدارة المنتجات» (active, 1450 SAR).
  *(Description text artifacts during typing came from the QA typing
  tool, not the app; the record was corrected via API afterwards.)*
- Admin console (browser-driven): dashboard metrics render live data
  (6 users, request counts by status); merchant verification approve
  works with confirm dialog and reflected state; payment submission
  created via merchant API then approved in console → subscription
  became ACTIVE (verified via `/merchant/subscription/current`:
  monthly period 2026-09-14 → 2026-10-14); manual entitlement grant →
  customer `/me/entitlements` returns `priority_support`; operational
  notification → delivered to customer `/notifications`; audit log
  recorded all four admin actions (`verification.verified`,
  `payment.approve`, `manual_grant.entitlement`, `notification.create`).

### New findings from this run

- **P2 (admin UX):** access-token expiry is enforced client-side by
  wiping the whole stored session — including the still-valid refresh
  token (`loadAdminSession`, `apps/admin/src/lib/admin-api.ts:51`).
  The single-retry silent refresh is therefore unreachable in the
  expired case and an admin working longer than 15 minutes is signed
  out mid-task (observed twice; in-flight form content is lost).
  Suggested fix: on expiry keep the refresh token and let the 401 →
  `tryRefresh()` path rotate the session.
- **P3 (test seed):** seed ships no `merchant` plan; the merchant
  subscription flow cannot be exercised without adding one (added
  manually during this run via `qa-seed-merchant-plan.cjs`).

### Notes for parallel work

- The emulator/UI session (`تحسينات UI/UX`) drives the same QA API and
  `khabir_test` database; this QA run shared it without conflicts.

---

## 7. GO / NO-GO pre-assessment

**NO-GO for production.** The release decision engine forbids a ready
classification while payment proof is impossible, native execution is
unverified, and the production topology is unresolved. These are external
dependencies/decisions, not engineering failures. This candidate is the
strongest state achievable in the current environment.
