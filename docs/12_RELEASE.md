# الخبير — Release Candidate Manifest

**Path:** `docs/12_RELEASE.md`
**Status:** Release Candidate **V2** — remediation applied, prepared for
independent audit #2 (Task REM). **NOT deployed. NOT merged to main.**

---

## 1. Release identity

| Field | Value |
|---|---|
| Branch | `review/release-candidate-v2` |
| Base branch | `review/remediation-mvp-blockers` |
| Previous RC | `review/release-candidate` @ `907122e44d7b84b57757e482b7916b68f74b22a3` |
| Release version | `0.0.1-rc.2` |
| API version | `0.0.1` (contract in `docs/api/openapi.yaml`) |
| Mobile version | `0.0.1` (Expo/RN; JS-only, no native artifact) |
| Admin web | `0.0.1` (Next.js) |
| Landing web | `0.0.1` (Next.js) |
| Database | managed PostgreSQL + PostGIS; **6 migrations** |

---

## 2. Remediation outcome

| ID | Blocker | Outcome |
|---|---|---|
| REM-001 | Customer request journey broken (no `/locations` API) | **FIXED** — API + Mobile + HTTP E2E closed |
| REM-002 | Payment proof not operational | **BLOCKED — CTO storage-provider decision required** |
| REM-003 | Native Android unverified | **BLOCKED — native QA environment required** |
| REM-004 | Rate-limit / lockout topology unresolved | **CTO DECISION REQUIRED** — constraint made explicit |

### REM-001 (fixed)
- Added `POST/GET/PATCH /locations` (owner-scoped, `customer|merchant`),
  `LocationDto`, validation, and an additive migration making location
  coordinates optional (`docs/06 §6` — "store exact coordinates only when
  required"; no map/geocoding provider is approved).
- Mobile service-request flow now **reads** locations (`GET /locations`)
  and **creates** them inline (label + optional address), then selects the
  new location and submits a real `location_id`. The previous permanent
  `LOCATION_MISSING_AR` dead-end is gone.
- Real HTTP E2E now creates the location through HTTP (no Prisma fixture)
  and asserts list/ownership/validation/IDOR.

### REM-002 (blocked — CTO decision)
No object-storage provider is approved (ADR-0004 excludes Supabase Storage;
`docs/local-dev.md §11` lists it as a CTO decision). No provider was
invented; no fake upload. `proofStorageKey` remains a reserved reference.

### REM-003 (blocked — environment)
No Android emulator binary, no AVD, and no connected device exist in the
build environment. Native QA was not faked; browser QA is not a substitute.

### REM-004 (CTO decision)
`@nestjs/throttler` and `LoginAttemptGuard` are in-memory (process-local).
The API now emits a production `topology-notice` warning and
`docs/11_PRODUCTION.md §7` makes the single-instance constraint explicit.
The topology itself (single vs multi-instance, shared store) is not yet
approved.

---

## 3. Verification summary

| Gate | Result | Evidence |
|---|---|---|
| Repo typecheck | PASS (11/11 packages) | `pnpm typecheck` |
| Repo lint | PASS (0 errors) | `pnpm lint` |
| API unit + e2e (in-memory) | PASS — 24 files / 183 tests | `pnpm --filter @khabir/api test` |
| Mobile tests | PASS — 27 files / 249 tests | `pnpm --filter @khabir/mobile test` |
| Real HTTP E2E (isolated `khabir_test`) | PASS — 3 files / **18 tests**, RUN 1 + RUN 2 | `pnpm --filter @khabir/api test:http-e2e` |
| OpenAPI + generated types | deterministic | `pnpm gen:openapi`, `pnpm gen:types` |
| Migrations | additive, non-destructive | `20260914000000_location_coordinates_optional` |
| Native Android QA | NOT RUN — no runtime | — |
| Payment proof | BLOCKED — no approved provider | — |

---

## 4. Database migration state

```text
20260101000000_init_identity
20260910000000_domain_foundation
20260911000000_technician_service_areas
20260912000000_payments_and_grants
20260913000000_technician_self_service
20260914000000_location_coordinates_optional   (new in RC v2)
```

The new migration only relaxes `locations.latitude/longitude` NOT NULL
(no DROP TABLE/COLUMN, no data rewrite).

---

## 5. Known risks

- **P1:** Payment proof not operational (CTO storage-provider decision).
- **P1:** Native Android unverified (no runtime; environment required).
- **P1:** Rate-limit/lockout topology unapproved (single-instance only).
- **P2:** Location coordinates are manual/optional; a map picker requires a
  geocoding provider decision.
- **P2:** Admin plan/pricing/entitlement management, notification audience/
  channel/scheduling remain unimplemented (documented in `docs/09_ADMIN.md`).
- **P3:** Admin web remains a functional console; missing `favicon.ico`.
- **P3:** Pre-existing full-suite flake in one raw-SQL integration probe
  (passes in isolation).

---

## 6. GO / NO-GO pre-assessment

**NO-GO.** REM-001 is resolved, but the release gate (`§14` of the
remediation brief) forbids a ready classification while payment proof is
blocked, native core flow is unverified, and the production topology is
unresolved. These are CTO / environment decisions, not engineering
failures. Release Candidate V2 is complete and ready for independent
audit #2.
