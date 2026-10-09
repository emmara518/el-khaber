# الخبير — V2 Readiness Audit (evidence-backed)

**Path:** `docs/16_V2_READINESS_AUDIT.md`
**Status:** Audit only. **V2 implementation has NOT started.** No schema, security,
infrastructure, or deployment changes accompany this document.
**Branch:** `review/final-production-release`
**Basis:** current repository at the release branch + live UAT evidence gathered
during the UAT release (Railway API, Supabase `khabir-dev`, Vercel UAT frontend,
Cloudflare Worker, Supabase Storage S3).

> This report distinguishes **verified** facts (code/tests/live checks) from
> **inferred** ones. Anything not directly verified is marked as such.

---

## 1. Executive readiness assessment

The product is a **functional UAT-grade** platform: identity/roles, catalog,
service requests, subscriptions/payments (manual proof), merchant products,
chat/notifications (HTTP), and password reset all work against the real backend
and `khabir-dev`. UAT smoke for Customer/Technician/Merchant and the payment
proof (media) lifecycle pass against the deployed API.

It is **not production-ready**. The main blockers are operational/security and
scope, not core functionality: process-local rate limiting, deferred secret
rotation, a trial-only API host, no automated restore drill, and unverified
security-advisor posture. Admin dashboard and realtime messaging are out of the
current MVP scope.

**Overall:** `V2 recommended` = hardening + operational readiness + UX
completion. **`V2 approved` = nothing yet** (all items require CTO gates).

---

## 2. Roadmap matrix (area → status → evidence)

Legend: `DELIVERED` · `PARTIAL` · `BLOCKED` · `NOT IMPLEMENTED` · `NEEDS CTO DECISION`

| #   | Area                                                                                                        | Status                          | Evidence                                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Customer journey (login, catalog, fault guide, technician search, request, profile/location, notifications) | **DELIVERED**                   | API smoke 200 on `/me`, `/service-requests`, `/locations`, `/notifications`; public `/appliance-categories` (10), `/technicians`, `/faults`; e2e reset-page suite |
| 2   | Technician journey (login, profile, services, requests, stats)                                              | **DELIVERED**                   | API smoke 200 on `/technician/{profile,services,requests,stats}`                                                                                                  |
| 3   | Merchant journey (login, profile, products)                                                                 | **DELIVERED**                   | API smoke 200 on `/merchant/profile`, `/merchant/products`                                                                                                        |
| 4   | Auth/session + password reset                                                                               | **DELIVERED**                   | argon2id (19 MiB, t=2); JWT + DB principal re-check; refresh rotation/family-revoke; reset via Worker→Resend→mailbox; single-use/expiry tests (API 62/62)         |
| 5   | Service requests + status transitions                                                                       | **PARTIAL**                     | Request list/detail present; technician transitions exist but **not exhaustively UI-verified** in UAT                                                             |
| 6   | Subscriptions / entitlements / manual payments + proof                                                      | **DELIVERED (UAT)**             | Proof upload-url 200 → S3 PUT 200 → confirm 200 (key bound), private bucket (anon 403), MIME/size enforced, cross-account 404                                     |
| 7   | Media/proof storage                                                                                         | **DELIVERED (UAT)**             | Supabase Storage S3 (private `khabir-dev-proofs`, 5 MB, jpeg/png/webp)                                                                                            |
| 8   | Chat & notifications                                                                                        | **PARTIAL**                     | HTTP-based (not realtime); notifications read works; deep chat UI not re-verified in UAT                                                                          |
| 9   | Reviews & ratings                                                                                           | **PARTIAL**                     | Models/endpoints exist (docs/06); not exercised in UAT                                                                                                            |
| 10  | Admin dashboard                                                                                             | **NOT IMPLEMENTED (by design)** | docs/09 states admin ops are out-of-band; admin API exists, no UI                                                                                                 |
| 11  | API completeness & authorization                                                                            | **DELIVERED**                   | Uniform 404 cross-account; ownership checks; guards + role decorators                                                                                             |
| 12  | Database model / migrations                                                                                 | **DELIVERED (unchanged)**       | 8 migrations; khabir-dev schema in sync; no drift introduced                                                                                                      |
| 13  | RLS / security advisors / PostGIS                                                                           | **NEEDS CTO DECISION**          | Not audited this cycle; do not change without a dedicated security pass                                                                                           |
| 14  | Arabic RTL / i18n / a11y / responsive                                                                       | **PARTIAL**                     | Arabic-first UI + RTL verified visually; a11y/responsive not systematically audited                                                                               |
| 15  | Automated tests / CI / e2e                                                                                  | **PARTIAL**                     | API 62, mobile 30, Worker 28, e2e Scenario A 4/4; CI green; role **UI** e2e thin                                                                                  |
| 16  | Infra / env / observability / cost / recovery                                                               | **PARTIAL/BLOCKED**             | Railway **Trial** (temporary); process-local rate limiting; no restore drill; observability basic                                                                 |

---

## 3. UAT outcomes (this cycle)

- **PASS:** API readiness + DB (`khabir-dev`), CORS, frontend↔API from the
  deployed origin, role logins + role endpoints (C/T/M), password-reset
  delivery (deployed), proof/media upload+confirm+privacy, e2e Scenario A 4/4,
  CI green.
- **Caveats:** role **UI** flows verified mainly at API level; admin presigned
  **retrieval** path not exercised (no admin credentials); proof tested on a QA
  fixture submission.
- **Not production:** temporary trial host; deferred secret rotation.

---

## 4. P0 / P1 issues (before public launch)

**P0**

1. **Exposed Resend API key** — rotation explicitly deferred; **must rotate**
   before production (send-only key; scope-limited but still exposed).
2. **Temporary API host** — Railway Trial credit exhaustion takes the API
   offline; production needs a durable, funded host.
3. **Process-local rate limiting / login lockout** — not globally enforced
   across replicas; a shared store (or single-instance guarantee) is required.
4. **Secret/backup hygiene** — no automated DB restore drill; confirm Supabase
   backups/PITR and a tested restore.

**P1** 5. **Sender restriction** — `onboarding@resend.dev` is limited to the owner
email; production needs a verified sending domain (deliverability). 6. **Security advisor + RLS review** — unverified; needs a dedicated audit. 7. **Observability** — add structured error tracking/metrics/uptime alerts. 8. **Access-token revocation** — stateless access tokens remain valid ≤15 min
after session revoke; document or add a token-version mechanism if required. 9. **Test breadth** — role UI e2e and destructive-lifecycle e2e gaps.

---

## 5. V2 opportunities (product) vs mandatory fixes

**Mandatory (hardening / launch):** items 1–9 above.

**Product opportunities (V2 recommended, not approved):**

- Realtime messaging (replace HTTP polling).
- Admin dashboard UI (replace out-of-band ops).
- Automated payment proof review workflow + notifications.
- Request photo upload in the customer flow (currently unavailable).
- Offline/low-connectivity resilience for mobile.
- Ratings/reviews surfaced end-to-end.

---

## 6. Technical debt & architecture risks

- **Single-instance coupling** of in-memory throttling/lockout (no shared store).
- **Provider abstraction** for storage is clean (S3 adapter reuse worked), but
  Supabase S3 keys **bypass RLS** — backend-only discipline is essential.
- **Prisma engine/libssl** packaging required container fixes; keep binary
  targets pinned for the target runtime.
- **Monorepo deploy** on non-Docker platforms is fragile (already NO-GO for
  Workers/Vercel-functions).
- **Admin surface** absent means support workflows are manual.

---

## 7. Required API / data-model work (candidates)

- Optional `tokenVersion` (or `validAfter`) for immediate access-token revoke.
- Shared-store rate limiting (e.g., managed Redis/Key-Value) — **cost gate**.
- Realtime channel (WebSocket/SSE) if messaging goes realtime.
- Explicit proof-review states surfaced to clients (status lifecycle).
- **No schema/migration changes are made by this audit.**

---

## 8. UX / accessibility / localization

- Arabic-first + RTL present; enforce zero `letter-spacing` on Arabic.
- Systematic a11y pass (focus order, contrast, labels, 44px targets).
- Responsive matrix (375–1440) across roles.
- Empty/loading/error states audited per screen.

---

## 9. Testing strategy & acceptance criteria (V2)

- Deterministic role **UI** e2e (login → core flow per role) in TesterArmy.
- Destructive reset lifecycle on a disposable account (token single-use).
- Contract tests for every public endpoint (schema + authz).
- Media tests: MIME/size rejection, private-bucket denial, presigned TTL.
- **DoD:** CI green; each WP ships tests + evidence; no P0 open.

---

## 10. Infrastructure & cost risks

- **Zero-cost is temporary:** Railway Trial; Supabase Free (1 GB storage).
- Production needs funded hosting + verified email domain + shared store.
- Cost controls: budgets/alerts, egress monitoring (storage bandwidth).

---

## 11. Dependencies & critical path

`Rotate Resend key` → `durable host` → `shared-store rate limiting` →
`verified sending domain` → `security/RLS audit` → `observability` →
`role UI e2e breadth` → `admin dashboard (optional)`.

---

## 12. Proposed V2 work packages (recommended, not approved)

| ID    | Work package            | Deliverable                                          | Definition of Done                  |
| ----- | ----------------------- | ---------------------------------------------------- | ----------------------------------- |
| V2-00 | Security hygiene        | Rotate Resend key; secret inventory; no exposed keys | Key rotated; scan clean; documented |
| V2-01 | Durable API host        | Move API off Trial to a funded host                  | Stable URL; readiness; rollback doc |
| V2-02 | Shared-store throttling | Distributed rate-limit + lockout                     | Multi-replica safe; tests           |
| V2-03 | Email domain            | Verified sending domain + sender                     | Non-owner recipients deliver        |
| V2-04 | Security/RLS audit      | Advisor + RLS review + fixes                         | Findings closed or accepted         |
| V2-05 | Observability           | Errors/metrics/uptime alerts                         | Alerts fire in a drill              |
| V2-06 | Role UI e2e breadth     | C/T/M UI suites                                      | Deterministic; CI green             |
| V2-07 | Realtime messaging      | WS/SSE channel                                       | Latency target; fallback            |
| V2-08 | Admin dashboard         | Minimal ops UI                                       | Core review actions work            |
| V2-09 | Backup/restore drill    | Tested restore runbook                               | Documented RTO/RPO                  |

Order by severity/dependency (V2-00…V2-04 first).

---

## 13. Assumptions & CTO decision gates

- **Assumptions:** Supabase `khabir-dev` remains the UAT DB; UAT is
  non-commercial; no paid activation without approval.
- **Gates (need CTO):** funded host + budget; paid shared store; verified email
  domain purchase; RLS/security policy changes; admin scope; realtime scope.
- **Explicit:** this document **proposes** V2; it does not authorize it.
  `V2 recommended` ≠ `V2 approved`.
