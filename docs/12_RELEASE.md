# الخبير — Release Candidate Manifest

**Path:** `docs/12_RELEASE.md`
**Status:** Release Candidate — prepared for independent audit (Task 12A/12B)
**NOT deployed. NOT merged to main.**

---

## 1. Release identity

| Field | Value |
|---|---|
| Branch | `review/release-candidate` |
| Base branch | `review/task-11-hardening` |
| Release version | `0.0.1-rc.1` |
| API version | `0.0.1` (NestJS; contract in `docs/api/openapi.yaml`) |
| Mobile version | `0.0.1` (Expo/RN; JS-only, no native artifact) |
| Admin web | `0.0.1` (Next.js) |
| Landing web | `0.0.1` (Next.js) |
| Database | managed PostgreSQL + PostGIS; 5 migrations |

Git SHA is recorded at the end of the master completion report and on the
branch tip (`git rev-parse HEAD`).

---

## 2. Verification summary

| Gate | Result | Evidence |
|---|---|---|
| Repo typecheck | PASS (11/11 packages) | `pnpm typecheck` |
| Repo lint | PASS (0 errors; warnings only) | `pnpm lint` |
| API unit + e2e (in-memory) | PASS — 24 files / 183 tests | `pnpm --filter @khabir/api test` |
| API integration (real `khabir-dev`) | PASS | `*.integration.spec.ts` |
| Real HTTP E2E (isolated `khabir_test`) | PASS — 3 files / 17 tests, run twice | `pnpm --filter @khabir/api test:http-e2e` |
| Mobile tests | PASS — 27 files / 249 tests | `pnpm --filter @khabir/mobile test` |
| API production build | PASS | `pnpm --filter @khabir/api build` |
| Admin production build | PASS | `pnpm --filter @khabir/admin build` |
| Landing production build | PASS | `pnpm --filter @khabir/landing build` |
| OpenAPI + generated types | deterministic | `pnpm gen:openapi`, `pnpm gen:types` |
| Admin browser QA | PASS (login, dashboard metrics, users list; RTL) | Playwright against isolated DB |
| Native Android QA | NOT RUN — no emulator/AVD/device available | — |
| Payment proof (10L) | BLOCKED — no approved storage provider | — |

---

## 3. Database migration state

Applied migration set (both `khabir-dev` and the isolated `khabir_test`):

```text
20260101000000_init_identity
20260910000000_domain_foundation
20260911000000_technician_service_areas
20260912000000_payments_and_grants
20260913000000_technician_self_service
```

No new migrations were added by the hardening/RC phases. Application is
additive/non-destructive.

---

## 4. Environment matrix

| Env | API | DB | Purpose |
|---|---|---|---|
| development | local | `khabir-dev` | manual dev |
| test | local (ephemeral) | `khabir_test` (Docker) | real HTTP E2E, fail-closed |
| production | TBD | dedicated managed PG | not deployed |

Secrets never committed; production values are platform-provided.

---

## 5. Known risks (carried into the audit)

- **P0:** none identified in the verified surfaces.
- **P1:** Payment proof storage blocked (CTO provider decision) — the MVP
  payment flow persists a typed transfer reference but cannot store/view a
  proof image.
- **P1:** Native Android runtime not verified (no emulator/device; install
  not authorized).
- **P1:** Rate limiting + failed-login lockout are in-memory per instance;
  unsafe if the API runs multi-instance without a shared store.
- **P2:** Merchant product lifecycle + review moderation were exercised
  through HTTP E2E; the merchant/reviewer mobile screens were not re-run in
  a native runtime.
- **P3:** Admin web is a "kitchen-sink" console (functional, not the final
  visual design); `favicon.ico` missing (benign 404).

---

## 6. GO / NO-GO pre-assessment (Task 12C)

The final MVP GO/NO-GO is **NO-GO** while the mandatory payment-proof path
is blocked and native QA is unverified. All other independently executable
engineering phases are complete and evidence-backed. See the master report.
