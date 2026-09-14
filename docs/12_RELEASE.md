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
| Native QA execution | NOT RUN — no runtime | — |
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
- **P1:** Native execution unverified — APK built but never launched
  (no emulator/device; environment required).
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

## 7. GO / NO-GO pre-assessment

**NO-GO for production.** The release decision engine forbids a ready
classification while payment proof is impossible, native execution is
unverified, and the production topology is unresolved. These are external
dependencies/decisions, not engineering failures. This candidate is the
strongest state achievable in the current environment.
