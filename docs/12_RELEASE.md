# الخبير — Release Candidate Manifest

**Path:** `docs/12_RELEASE.md`
**Status:** Release Candidate **V3** — final blocker-closure sprint applied,
prepared for independent audit #3. **NOT deployed. NOT merged to main.**

---

## 1. Release identity

| Field | Value |
|---|---|
| Branch | `review/release-candidate-v3` |
| Base branch | `review/final-mvp-blocker-closure` |
| Previous RC | `review/release-candidate-v2` @ `f516c6b18277058c76b4b3ef47c22a119777a6df` |
| Release version | `0.0.1-rc.3` |
| API version | `0.0.1` (contract in `docs/api/openapi.yaml`) |
| Mobile version | `0.0.1` (Expo/RN; JS-only, no native artifact) |
| Admin web | `0.0.1` (Next.js) |
| Landing web | `0.0.1` (Next.js) |
| Database | managed PostgreSQL + PostGIS; **6 migrations** |

---

## 2. Blocker-closure outcome (final sprint)

| ID | Blocker | Outcome |
|---|---|---|
| REM-001 | Customer request journey (`/locations`) | **CLOSED — VERIFIED, no regression** (HTTP E2E 18/18) |
| Payment proof | No approved storage provider | **STILL BLOCKED — CTO decision required** (no provider invented) |
| Native Android | No runtime in build environment | **STILL BLOCKED — environment required** (not faked) |
| Topology | Unapproved single- vs multi-instance | **STILL OPEN — CTO decision required** (explicit constraint kept) |
| Subscription policy | Provisional 30-day period | **Kept provisional** — single source, docs-marked, ratification recommended |

### New in V3 (hardening on top of RC2)
- REM-001 guard re-run green before any new work.
- Fixed a stale Mobile comment that still claimed “no locations API exists”.
- Fixed explicit-`null` coordinates coercing to `0`: `null` is now
  normalized to omitted (consistent with the optional contract), and an
  all-`null` PATCH body is rejected as empty — unit-covered in
  `test/validation.spec.ts`.
- Fixed the OpenAPI generator dropping `optional` through `z.preprocess`
  wrappers (fields were wrongly emitted `required`); regenerated contract
  is byte-deterministic again.

### What was deliberately NOT done
- No storage provider invented (Supabase Storage / S3 / R2 / Cloudinary /
  Firebase / local filesystem / Base64) — payment proof stays blocked.
- No Android runtime installed — native QA stays unverified.
- No Redis/shared store installed — topology stays a CTO decision.
- No pricing, billing cadence, or notification semantics invented.

---

## 3. Verification summary

| Gate | Result | Evidence |
|---|---|---|
| Repo typecheck | PASS (11/11 packages) | `pnpm typecheck` |
| Repo lint | PASS (0 errors) | `pnpm lint` |
| API unit + e2e (in-memory) | PASS — 24 files / **187 tests** | `pnpm --filter @khabir/api test` |
| Mobile tests | PASS — 27 files / 249 tests | `pnpm --filter @khabir/mobile test` |
| Real HTTP E2E (isolated `khabir_test`) | PASS — 3 files / **18 tests**, RUN 1 + RUN 2 | `pnpm --filter @khabir/api test:http-e2e` |
| OpenAPI + generated types | deterministic | `pnpm gen:openapi`, `pnpm gen:types` |
| Migrations | additive, non-destructive (6 total, no new migration in V3) | `prisma/migrations` |
| khabir-dev residue | ZERO (all probe prefixes 0/0/0) | probe query |
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
20260914000000_location_coordinates_optional
```

No new migration in V3 (validation-only changes need none).

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
  (passes in isolation; green in this sprint's full run).

---

## 6. GO / NO-GO pre-assessment

**NO-GO.** The release gate forbids a ready classification while payment
proof is blocked, native core flow is unverified, and the production
topology is unresolved. These are CTO / environment decisions, not
engineering failures. Release Candidate V3 is complete and ready for
independent audit #3.
