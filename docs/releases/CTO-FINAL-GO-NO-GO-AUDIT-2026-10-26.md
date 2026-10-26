# EL-KHABIR — CTO Final GO / NO-GO Audit

**Audit date:** 2026-10-26  
**Audit type:** read-only release readiness review  
**Scope:** Web-first production, UAT/engineering candidate, Native Android, and
the backend/database/admin/mobile evidence behind them.

---

## 0. Executive Decision

| Scope | Decision |
| --- | --- |
| **Web-first production** | **NO-GO** |
| **Current UAT deployment** | **NO-GO** — neither deployed artifact is proven against the release SHA |
| **UAT engineering candidate** | **CONDITIONAL GO** only for an isolated, non-customer deployment of a freshly verified SHA; not for production |
| **Native Android release** | **NO-GO** — independent track; does not block Web-first by itself |

The decisive issue is not a shortage of green tests. It is that **there is no
single releasable artifact that is both CI-verified and security-complete**:

- The documented release SHA `739f9eb` is CI-green, but it still contains the
  `AUTH-001` account-takeover chain and other findings from the backend audit.
- The remediation that closes those findings exists only in the **uncommitted
  working tree** on `b63354f`.
- The working tree has **no CI run**, and its release documents and migration
  chain differ from the release branch.
- All production external gates (#24–#28) remain open.
- The current Vercel/Railway UAT artifacts predate the release and have no
  verified Git/SHA provenance.

Therefore the CTO cannot approve production. The correct next step is to
freeze one new SHA, run CI on it, close the external gates against that exact
SHA, and then re-audit.

---

## 1. Verified Baseline

### 1.1 Version and tree state

| Item | Verified value |
| --- | --- |
| Current branch | `docs/remove-obsolete-engineering-markdown` |
| Current HEAD | `b63354f748bdee1c28cf79f8476f5bed97680810` |
| HEAD relation to release | `739f9eb` is an ancestor of `b63354f`; `b63354f` is docs-only on a separate branch, not on the release branch |
| Documented release SHA | `739f9ebc964d0415686f1827942d8b07a3f70c30` (`release/v2.1.0-uat`) |
| Release CI | Run `39648511261` — success; PR-context run `39648520896` — success |
| Docs branch CI | Run `39654963665` at `b63354f` — success |
| Working tree (at audit start) | **250 entries**: 193 modified, 1 deleted, 56 untracked; `git diff --stat` = 194 files, +2648/−2574 |
| Working-tree CI | **NONE** |
| PR #17 | OPEN, Draft, head `739f9eb`, 0 reviews |
| PR #31 | OPEN, head `b63354f`, docs only |
| Open production issues | #24, #25, #26, #27, #28, #30 |

### 1.2 Release documentation inconsistency

This is a real provenance defect, not a cosmetic one:

- At release SHA `739f9eb`, `docs/releases/V2.1.0-RELEASE-GATE.md` still says
  **release SHA `4506bd7`** and CI `39637867686`.
- At the same SHA, `docs/14_PRODUCTION_DEPLOY_RUNBOOK.md` still says
  **15 applied** and **7 of 8**, and lists only the first 15 migrations.
- `b63354f` / PR #31 corrects the gate to `739f9eb`, but the same docs branch
  still says **15 applied / 7 of 8** in `docs/14`.
- The 27-migration runbook text exists only in the uncommitted working tree;
  release `739f9eb` and docs branch `b63354f` both have **18** migrations.
- PR #31 is open and not merged into the release branch.

A deployer using the release branch would read stale instructions; a deployer
using the working-tree docs would target a schema that is not in the release
artifact. This must be fixed before any deployment record is trusted.

### 1.3 Evidence that is genuinely verified

| Evidence | Result | Classification |
| --- | --- | --- |
| Release CI at `739f9eb` | success, four jobs | **Release evidence** |
| Docs CI at `b63354f` | success, four jobs | **Docs-branch evidence only** |
| API working-tree suite | **54 files / 455 tests pass** | Local, uncommitted |
| API real-HTTP E2E | **42/42 pass** | Local, uncommitted |
| API typecheck / test typecheck | pass | Local, uncommitted |
| Admin current typecheck / lint / build | pass | Local, uncommitted |
| Admin current unit tests | **27/27 pass** | Local, uncommitted |
| Mobile current tests | **507/507 pass** (70 files) | Local, uncommitted |
| Mobile typecheck / lint | pass | Local, uncommitted |
| Local migration status | 27 migrations, up to date | Disposable local DB only |
| Admin API/controller E2E | service-level and real-HTTP review-removal evidence | Local, uncommitted |
| Batch B web evidence | 507/507; targeted axe; responsive screenshots | Historical working-tree evidence |
| Native Android B8 core | pass in Expo Go only | Native partial evidence, not build acceptance |

**No PASS above is CI evidence for the current working tree.** The local API
numbers come from `.qa/residual-full-suite-ts.log` and
`.qa/residual-http-e2e-ts.log` (2026-10-24). The audit-generated current checks
are in `.qa/cto-audit-admin-*` and `.qa/cto-audit-mobile-*` (2026-10-26).

---

## 2. Gate Register

Status vocabulary: `CLOSED — VERIFIED`, `CLOSED IN CODE, EXTERNAL VERIFICATION
REQUIRED`, `PARTIALLY CLOSED`, `OPEN`, `EXTERNAL GATE`, `NOT VERIFIED`,
`NOT APPLICABLE TO CURRENT RELEASE SCOPE`.

Severity is **release impact** (how the item affects the GO decision), not a
reclassification of the source audit severity. Where the source audit used a
different severity, that is stated in the evidence.

Unless a row explicitly says “release”, backend and UI remediation statuses
below describe the **working tree**, not `739f9eb`.

| ID | Scope | Status | Severity | Evidence / version | What is missing | Owner | Objective acceptance |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `REL-01` | One releasable SHA | **OPEN** | P0 | `739f9eb` vs 250 working-tree entries; remediation only in WT | Freeze one SHA; commit/PR; CI; update release gate | Engineering + CTO | One immutable SHA with green CI, reviewed diff, and no uncommitted release code |
| `REL-02` | Release gate/runbook at release SHA | **OPEN** | P1 | `739f9eb` gate says `4506bd7`; runbook says 15/7-of-8; `b63354f` gate is corrected but runbook still stale; PR #31 unmerged | Merge corrected gate and runbook, including the actual migration chain | Engineering/Release | Gate, runbook, and migration count match the deployed SHA |
| `REL-03` | Working-tree CI | **NOT VERIFIED** | P0 | No workflow run for current 250-entry tree | Run full CI on the chosen SHA | Engineering | All required jobs green on the exact release commit |
| `REL-04` | PR #17 and owner approval | **EXTERNAL GATE** | P0 | Draft, 0 reviews, head `739f9eb` | Owner approval after gates | Owner/CTO | Recorded approval of exact SHA and release scope |
| `REL-05` | Branch protection | **CLOSED — VERIFIED** | P1 | Rulesets `25568753` / `25568813` | None found | Engineering | Required checks remain enforced |
| `REL-06` | Accepted `/register` contrast risk | **PARTIALLY CLOSED** | P3 | 4.40196:1; owner accepted; not WCAG PASS | Keep written acceptance attached to release | Owner/CTO | Acceptance remains documented and scoped |
| `AUTH-001` | Release security: email-change/reset takeover | **OPEN** | P0 | Source audit P1; release impact blocks. `docs/19` against `739f9eb`; fix only in WT | Commit fix; CI on release SHA | Engineering | Release SHA cannot change email into reset without verification |
| `AUTH-003` | Registration/contact enumeration | **OPEN** | P2 | Distinct 409 remains in WT and release | Product decision: uniform response or explicit risk acceptance | Product/CTO | Signed decision plus contract/tests if changed |
| `AUTH-005` | Durable reset delivery | **OPEN** | P1 | Fire-and-forget delivery; no outbox | Outbox/retry/dead-letter or explicit out-of-scope decision | Engineering + Product | No 202 without durable delivery intent |
| `SEC-001` | Public ACL parity | **EXTERNAL GATE** | P0 | Local migration revokes grants; production unverified | Production grant query | DevOps/DB | Zero `anon`/`authenticated` grants on public tables |
| `SEC-002` | Presigned upload controls | **PARTIALLY CLOSED** | P1 | TTL 300s, MIME allowlist, ownership, HEAD size; cleanup added | Sign Content-Length/POST policy; issuance throttle; lifecycle; request-media cleanup | Engineering + Provider | Oversized object cannot be stored or is lifecycle-reclaimed; abuse bounded |
| `DB-001` | Runtime DB role/RLS | **EXTERNAL GATE** | P0 | Local `db:check-runtime-role` pass only | Production role, ownership, RLS, timezone | DevOps/DB | Target check output accepted with no credentials |
| `DB-005` | Naive timestamps | **PARTIALLY CLOSED** | P2 | Runtime UTC guard; columns still `TIMESTAMP(3)` | Prove production session UTC; decide `timestamptz` later | DevOps/DB + CTO | Target session is UTC/Etc/UTC and documented |
| `DB-007` | Runbook count | **PARTIALLY CLOSED** | P1 | WT says 27; release says 15/7-of-8; release has 18 | Correct docs on release SHA | Engineering/Release | Deployed chain and docs match |
| `DB-011` | Status/timestamp invariant | **CLOSED IN CODE, EXTERNAL VERIFICATION REQUIRED** | P2 | WT migration + Admin writes; local suite pass | Apply/inspect on target | DevOps/DB | CHECK exists and migrated rows conform |
| `REL-001` | Readiness wiring | **EXTERNAL GATE** | P1 | `/ready` exists; render/Docker probe still `/health`; Railway healthcheck null | Wire platform to `/ready` and alert | DevOps | Platform probe path is `/api/v1/ready` |
| `REL-003` | Structured logging | **CLOSED IN CODE, EXTERNAL VERIFICATION REQUIRED** | P3 | `NestStructuredLogger`, `app.useLogger`, unit test, local suite | Production log sample | Engineering | One JSON object per line in platform logs |
| `REL-004` | Rate-limit key length | **OPEN** | P3 | Raw `identifier` still `VARCHAR(255)`: 254-char email + IPv6 can exceed | Hash/length cap and test | Engineering | Long identifier returns controlled 429/400, not 500 |
| `TEST-003` | Test typecheck | **PARTIALLY CLOSED** | P2 | `typecheck:test` covers HTTP/new specs; legacy specs excluded | Full test typecheck or documented exclusion | Engineering | No legacy test type debt in release |
| `TEST-004` | Bootstrap parity | **CLOSED — VERIFIED** | P2 | Shared `configureApp`; trust-proxy HTTP assertion; unit test | None | Engineering | Harness and production share bootstrap |
| `API-001` | Unknown reject status | **CLOSED — VERIFIED** | P3 | WT: 404 unknown, 409 reviewed; real HTTP test | None | Engineering | Contract and test agree |
| `API-002` | Malformed `mediaId` | **CLOSED — VERIFIED** | P3 | UUID pipe includes `mediaId`; unit test | None | Engineering | Malformed id returns controlled 404 |
| `API-003` | Media confirm cap race | **PARTIALLY CLOSED** | P3 | Row lock in WT; no concurrent regression test | Add deterministic race test | Engineering | Concurrent confirms never exceed cap |
| `PAY-001` | Payment amount policy | **PARTIALLY CLOSED** | P2 | Snapshot stored; approval policy not decided | Product/finance decision on price mismatch | Product/Finance | Written rule + approval behavior |
| `DB-010` | Historical FK-swap hygiene | **OPEN** | P3 | Non-idempotent historical migration | Accept as historical or remediate | Engineering/CTO | Recorded decision |
| `PERF-001` | Coverage/load evidence | **NOT VERIFIED** | P3 | No load test; coverage imports `dist` | Capacity/load test if scale claimed | Engineering | Evidence for stated launch capacity |
| `ADM-01` | Admin role/API tests | **CLOSED — VERIFIED** | P1 | Current full suite includes role/HTTP review-removal tests | None for API | Engineering | 401/403/200 matrix proven |
| `ADM-02` | Admin current visual/a11y | **NOT VERIFIED** | P2 | Current typecheck/lint/build/27 unit; axe/screenshots predate 10/24 refactor | Re-run Playwright/axe/screenshots on current admin | Engineering/QA | Current admin matches role matrix and axe |
| `ADM-03` | Admin token storage | **OPEN** | P3 | `localStorage` session | Risk acceptance or httpOnly/memory redesign | Security/CTO | XSS impact bounded and accepted/closed |
| `UI-BATCH-B` | Web Batch B | **PARTIALLY CLOSED** | P2 | 507/507 current; visual evidence 10/22–24; WT later edits | New visual/axe pass on exact SHA | Engineering/QA | Current SHA passes Batch B visual matrix |
| `UAT-DEPLOY` | Deployment provenance | **EXTERNAL GATE** | P0 | Vercel/Railway artifacts created 2026-10-09; no Git metadata | Redeploy exact SHA; record IDs; verify health/title/API | DevOps | Deployment record matches SHA and CI |
| `NATIVE-01` | Native build/install | **OPEN** | P0 | Gradle plugin/version failures; old APK lacks `ExponentImagePicker` | Align SDK/deps; build dev client; install APK | Mobile/DevOps | Source-built APK launches on device |
| `NATIVE-02` | Native safe area | **OPEN** | P1 | Customer tab shell top inset missing | Fix tab header insets | Mobile | No overlap on API 35 |
| `NATIVE-03` | Native RTL cold start/chrome | **OPEN** | P1 | First render LTR; tab/stepper/action chrome LTR | Native RTL config and verified cold start | Mobile | RTL from first launch, no reload |
| `NATIVE-04` | Native discovery/gestures | **OPEN** | P1/P2 | Find Technician scroll/tap failure in Expo Go | Fix modal/scroll; retest dev client | Mobile | Tap/scroll/dismiss all work |
| `NATIVE-05` | Native B8 cancel/flow | **PARTIALLY CLOSED** | P2 | B8 form/safe area/cancel pass in Expo Go; cancel return path conflicting | Reconfirm on dev client | Mobile/QA | Cancel returns to expected route |
| `NATIVE-06` | Native toggles/JSON PUT | **OPEN** | P2 | No `PUT /notifications/preferences` in mock log | Toggle + persisted PUT | Mobile | Toggle changes server state |
| `NATIVE-07` | Technician Home/Discovery/Rating | **NOT VERIFIED** | P1 | Blocked on customer mock; not tested | Role-specific device run | Mobile/QA | Full role matrix passes |
| `NATIVE-08` | Native API isolation | **NOT VERIFIED** | P0 (Native/security) | `.env` contains production Railway URL; test driver overrides to mock; no provider logs | Inspect Railway logs; rotate if needed; use `.env.qa` | Owner/DevOps | Proof no production writes or documented incident |

The remaining backend remediation items are not repeated row-by-row because they
share one release problem: `AUTH-002/004/006`, `PAY-002`–`PAY-007`,
`DB-002/003/004/006/008/009` are closed or locally verified only in the working
tree and are absent from `739f9eb`. They are covered by `REL-01`/`REL-03`; the
individual evidence is in `BACKEND-REMEDIATION-RESIDUAL.md`.

---

## 3. Critical Findings

### C-01 — The release gate’s “code-complete” claim is not supported by the backend audit

`V2.1.0-RELEASE-GATE.md` says the release is code-complete and CI-green. The
backend audit against the same release SHA records `AUTH-001` (email change +
reset account takeover, P1), `AUTH-004`, and several database/security
findings. The fixes are in the working tree only. A green CI run cannot close a
finding that the tested SHA still contains.

**Impact:** the official release SHA is not safe to approve, regardless of
external gates. The current working-tree fixes are not a release artifact
because they are uncommitted and have no CI.

### C-02 — There is no single release candidate

The repository currently has three different states:

1. Release `739f9eb`: 18 migrations, CI-green, known P1 findings, stale gate
   documentation.
2. Docs branch `b63354f`: release code + corrected gate, CI-green, PR #31 open;
   the runbook migration count is still stale.
3. Working tree: 250 entries, 27 migrations, remediation/Batch B/admin/mobile
   changes, no CI.

A CTO cannot approve “the product” without deciding which state is the release.
If the answer is `739f9eb`, security findings remain. If the answer is the
working tree, there is no reviewed commit or CI. If the answer is `b63354f`,
only documentation changed; remediation is still absent.

### C-03 — Production database and recovery are unverified

Issue #24 is open. No production database role, ACL, migration chain, backup,
PITR, or restore drill was inspected by engineering. The local 27-migration
check and the local restore drill are mechanics evidence only. The production
chain must match whichever release SHA is chosen: 18 for `739f9eb`, 27 for the
working tree.

### C-04 — Consent is UI-only and legally unenforceable

`docs/security/CONSENT-ENFORCEMENT-SPEC.md` records that the mobile checkbox is
not sent to the API, the shared schema has no consent field, and the database
has no consent table/columns. Issue #26 is open. Legal text, versions,
controller identity, retention, and re-consent policy are absent. This is a
production blocker for any claim of recorded consent.

### C-05 — Password-reset delivery is not proven, and AUTH-005 is unresolved

The Worker tests exist, but no live provider delivery, mailbox receipt, or
provider message ID is recorded. `AUTH-005` still has no durable outbox/retry;
a 202 can exist without delivery. Issue #27 owns the provider and mailbox work.
Testing token mechanics without live delivery is not production evidence.

### C-06 — Readiness and deployment provenance are not wired

`/ready` checks unfinished migrations and a critical table, but:
- `render.yaml` still uses `healthCheckPath: /api/v1/health`;
- the Docker healthcheck uses `/health`;
- the current Railway service has `healthcheckPath: null`;
- the Vercel and Railway UAT artifacts predate `739f9eb` and have no Git
  metadata;
- no rollback rehearsal is recorded.

A liveness endpoint is not a readiness gate. The platform must use `/ready`,
and the deployed build must be tied to a SHA and CI run.

### C-07 — Presigned uploads still permit cost/abuse exposure

`SEC-002` is only partially closed. TTL (300s), MIME allowlist, ownership, HEAD
size verification, and rejection cleanup are present. The presigned PUT still
does not bind a maximum content length, issuance has no dedicated throttle, and
bucket lifecycle is not configured. Request-media uses the same adapter. An
authenticated client can place objects larger than the business limit before
confirm rejects them. This should be closed or explicitly risk-accepted before
Web GO.

### C-08 — Native Android is a separate NO-GO, not a Web blocker

The reports disagree: team `REPORT.md` says “PASS WITH RESERVATIONS”; the
independent report says “NOT ACCEPTED / FAIL”; the CTO memo says Native
NO-GO. The evidence supports the stricter conclusion:
- native build fails before compilation (`expo-module-gradle-plugin`, component
  `release` property);
- old APK crashes on missing `ExponentImagePicker`;
- customer tab headers overlap the status bar;
- cold-start RTL and tab/stepper/action chrome are LTR;
- Find Technician tap/scroll fails in Expo Go;
- AppSwitch toggle and `PUT /notifications/preferences` are not verified;
- Technician Home, Discovery/Rating, and Account Type selection are untested;
- cancel return destination conflicts between `37-after-cancel.png` (Home) and
  `cancel1.png` (Technician Profile).

Expo Go is not a native build acceptance environment. None of this blocks the
Web-first scope, but all of it blocks Android Native.

### C-09 — Native test API isolation is unproven

`apps/mobile/.env` contains the Railway production API URL; `.env.local`
contains only `VERCEL_OIDC_TOKEN`. Metro logs show it loading both, and the test
driver explicitly overrides Metro with the mock URL. The mock log records 547
local requests, but a mock log cannot prove that no earlier run reached
production. The statement in one report that `.env.local` pointed to production
is inaccurate for the current files; the risk is `.env` itself.

Required: Railway access-log review for the test window, confirmation of any
mutating requests, and rotation/prevention if production was touched. Do not
repeat the test until the API target is explicit and isolated.

---

## 4. External Actions

These cannot be closed by source review or local tests.

### Owner / CTO

1. Choose the release strategy:
   - new commit from the remediation working tree, then full CI and a new
     release gate; or
   - explicitly accept `739f9eb` with its known P1 findings (not recommended).
2. Decide `AUTH-003` (uniform response vs accepted enumeration).
3. Decide `SEC-002` (Content-Length/POST policy, throttle, lifecycle) or sign a
   bounded risk acceptance.
4. Decide `DB-005` (UTC-only runtime is acceptable; `timestamptz` later).
5. Decide `PAY-001` amount-mismatch/commercial policy.
6. Decide whether admin `localStorage` token storage is acceptable or must move
   to httpOnly/memory.
7. Approve PR #17 only after all gates and exact-SHA evidence.

### DevOps / DB

1. Provision/confirm dedicated production PostgreSQL/PostGIS isolated from
   `khabir-dev`.
2. Run the runtime-role preflight on the target; record role, owner,
   BYPASSRLS/RLS, DML, and UTC without credentials.
3. Verify zero `anon`/`authenticated` grants on public tables.
4. Apply the chain for the chosen SHA (18 for `739f9eb`; 27 for the current
   working tree) and record migration count.
5. Enable daily backups + PITR; record retention, RPO, RTO.
6. Execute a restore drill into a separate non-production instance and record
   schema/row counts.
7. Wire platform probes to `/api/v1/ready`; alert owner.

### DevOps / Hosting / Release

1. Approve an always-on paid plan; `render.yaml` still says `plan: free`.
2. Store the production environment matrix in the platform secret store.
3. Deploy the exact SHA with Git/commit metadata; record deployment ID, CI run,
   image/build ID, URLs, verifier, and rollback target.
4. Verify health, readiness, title, single `<main>`, API origin, sitemap 404.
5. Rehearse rollback to a target at or above the `c903e06` floor.
6. Do not describe the current Vercel/Railway artifacts as release-verified.

### Legal / Product

1. Final Arabic Terms and Privacy URLs with immutable versions.
2. Data-controller identity and privacy contact.
3. Approved consent wording, legal basis, retention/evidence requirements, and
   re-consent decision.
4. Implement the additive consent schema/API/mobile contract from
   `CONSENT-ENFORCEMENT-SPEC.md`; test missing/false/unknown-version/atomicity.

### Provider / QA (#27)

1. Configure the Worker’s active Resend key and verified sender domain.
2. Configure `PASSWORD_RESET_DELIVERY_URL`/`TOKEN` on the isolated UAT API.
3. Execute every step in `EMAIL_PASSWORD_RESET_UAT.md` with a dedicated mailbox.
4. Record provider message ID and redacted delivery evidence; never send to real
   customers.
5. Resolve whether `AUTH-005` outbox/retry is in scope or explicitly deferred.

### Security / Native QA

1. Inspect Railway access logs for the native test window; determine whether
   production requests occurred and whether any writes happened.
2. Remove production defaults from local ENV; use explicit `.env.qa` and an
   isolated API.
3. Rotate any credentials that may have been used if production access is
   confirmed.
4. Run Native only after dependency alignment/SDK decision and a source-built
   dev client.

---

## 5. Native Track

### Decision

**Native Android: NO-GO.** This is independent of Web-first production.

### What is proven

- The B8 service-request form renders, top/bottom safe area is correct, RTL form
  content is correct, and cancel returns without a crash in Expo Go.
- Technician Profile and Notifications render in the mock environment.
- The independent tester confirmed the Service Request core flow with
  reservations.

### What is not accepted

| Item | Finding |
| --- | --- |
| Native build | FAIL/BLOCKED before compilation; old APK crashes |
| Tab headers | Status-bar overlap on Home/Store/Profile/Notifications |
| RTL | First launch/chrome LTR; form-only RTL is not enough |
| Find Technician | Tap/scroll modal failure in Expo Go |
| Cancel | Return destination conflict between reports/screenshots |
| AppSwitch | Native toggle + persisted PUT not verified |
| Technician Home | Blocked; mock only provides customer login |
| Discovery/Rating | Not tested |
| Account Type selection | Not tested |
| API isolation | Production URL risk unproven; provider logs required |

The team’s “PASS WITH RESERVATIONS” verdict is not an acceptance verdict for a
native release. The independent “NOT ACCEPTED / FAIL” verdict is more consistent
with the build and visual evidence.

---

## 6. Final Decision Matrix

| Scope | Decision | Exact meaning |
| --- | --- | --- |
| **Web-first production** | **NO-GO** | No security-complete, CI-verified SHA; external gates #24–#28 and owner approval open |
| **Current UAT deployment** | **NO-GO** | Both deployed artifacts predate the release and have no verified SHA |
| **UAT engineering candidate** | **CONDITIONAL GO** | `739f9eb` may be used only in an isolated non-production environment, with no real customer data and no live reset delivery; current WT fixes require a new commit+CI before UAT |
| **Native Android** | **NO-GO** | Build, safe area, RTL, discovery, toggles, and technician flows fail/not verified |
| **Native in Web-first scope** | **NOT APPLICABLE** | Native does not block Web-first; it is a separate future release gate |

---

## 7. Minimum Remaining Work for Web GO

The CTO can move to **GO** only when all of the following are true:

1. **One immutable SHA** is chosen, containing either the accepted release code
   or the remediation; it is committed, reviewed, and CI-green.
2. The release gate and runbook at that SHA match its migration count and CI run.
3. **#24** has production DB, role/ACL/UTC, backup/PITR, and restore-drill
   evidence.
4. **#25** has paid always-on hosting, secret-store names, CORS/proxy, alert
   ownership, and `/ready` probes.
5. **#26** has legal decisions and transactionally persisted consent with tests.
6. **#27** has live reset delivery, mailbox receipt, and provider message ID;
   `AUTH-005` is either closed or explicitly out of scope.
7. **#28** has exact-SHA deployment provenance, health/readiness/title/API
   verification, and a rollback rehearsal.
8. `AUTH-003`, `SEC-002`, `DB-005`, `REL-004`, `PAY-001`, `TEST-003`, `API-003`,
   `DB-010`, admin token storage, and admin current visual/a11y have either
   closure evidence or recorded risk acceptance.
9. PR #17 has owner approval; PR #31 docs fixes are merged; PR #19 remains
   unmerged.
10. The launch decision is recorded against the exact SHA, not the working tree.

Native does **not** appear on this list. Its blockers are conditions for a
future Android release only, unless the CTO expands the current scope.

---

## 8. Evidence and Limitations

### Evidence read

- Release and provenance: `docs/releases/V2.1.0-RELEASE-GATE.md`,
  `docs/14_PRODUCTION_DEPLOY_RUNBOOK.md`,
  `docs/releases/PRODUCTION-DATABASE-RESTORE-RUNBOOK.md`,
  `docs/releases/DEPLOYMENT-PROVENANCE-AND-ROLLBACK.md`,
  `docs/releases/PRODUCTION-ENV-MATRIX.md`.
- Legal/email: `docs/security/CONSENT-ENFORCEMENT-SPEC.md`,
  `docs/uat/EMAIL_PASSWORD_RESET_UAT.md`.
- Backend: L1–L4, summary, residual; `docs/19_BACKEND_DATABASE_READINESS_AUDIT.md`.
- Admin: `docs/18_ADMIN_PANEL_AUDIT.md`,
  `docs/19_BATCH1_SECURITY_TESTS_UX_REPORT.md`.
- Mobile: `.qa/batchB-acceptance-report.md`,
  `.qa/native-batchB-acceptance/REPORT.md`,
  `INDEPENDENT-REPORT.md`, `CTO-REPORT.md`, Gradle logs, mock log.
- GitHub read-only: PR #17/#19/#31, issues #24–#28/#30, runs
  `39648511261`, `39648520896`, `39654963665`.

### Checks executed during this audit

- `pnpm --filter @khabir/admin typecheck` — pass
- `pnpm --filter @khabir/admin lint` — pass
- `pnpm --filter @khabir/admin test` — 27/27 pass
- `pnpm --filter @khabir/admin build` — pass
- `pnpm --filter @khabir/mobile test` — 507/507 pass
- `pnpm --filter @khabir/mobile typecheck` — pass
- `pnpm --filter @khabir/mobile lint` — pass
- `git diff --check` — exit 0
- Read-only Git/GitHub inspection; no production/shared DB access.

### Not verified

- No production database, backup, PITR, ACL, timezone, or restore drill.
- No live email provider or mailbox.
- No Vercel/Railway provider logs.
- No current admin browser/axe run after the dashboard refactor.
- No current Batch B visual/axe run after 2026-10-24 mobile edits.
- No source-built native APK/dev client; Expo Go only.
- No load/capacity test.
- No CI run on the 250-entry working tree.
- No claim that the current UAT deployments correspond to any SHA.

### Evidence classification

- **Release evidence:** `739f9eb` CI runs only.
- **Docs-branch evidence:** `b63354f` CI only; docs-only change from release.
- **Working-tree evidence:** API 54/455, HTTP 42/42, admin 27, mobile 507, local
  27 migrations; not CI, not release.
- **Historical evidence:** Batch B visual/axe, native Expo Go runs, local
  restore drill.
- **External evidence:** issues #24–#28/#30; all open.

---

## 9. Direct Answer

The remaining list that would allow the CTO to change the decision to **GO for
Web-first production** is:

1. a single committed, CI-green SHA;
2. corrected release gate/runbook for that SHA;
3. #24 production database, role/ACL/UTC, backup/PITR, restore drill;
4. #25 hosting, budget, secrets, `/ready` probes, alerts;
5. #26 legal/consent decisions plus enforced consent persistence;
6. #27 live email delivery with provider evidence;
7. #28 exact-SHA provenance and rollback rehearsal;
8. closure or written risk acceptance for the remaining backend/admin items;
9. owner approval of PR #17.

The following are **not** Web-first conditions and belong to the separate Native
track: native Gradle/SDK alignment, source-built dev client, tab safe area,
cold-start RTL, Find Technician gestures, AppSwitch/PUT, Technician
Home/Discovery/Rating, Account Type selection, and the native API-isolation
investigation. They block an Android release, not the Web release.

**Final decision: NO-GO.**
