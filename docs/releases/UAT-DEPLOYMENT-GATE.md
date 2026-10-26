# UAT Deployment Gate (V2.1)

**Purpose:** one repeatable, fail-safe procedure for the authorized UAT target.
It never touches `khabir-prod`, never applies production migrations, and never
prints secret values.

**Application candidate:** `8259709926f2cb48e6dcf7f143079102eac70e2d` on
`release/v2.1.0-rc-20261026`, CI run
[40418256331](https://github.com/emmara518/el-khaber/actions/runs/40418256331)
— success. See `docs/releases/V2.1.0-RC-20261026.md`.
**Gate tooling:** the hardening in this file and in `scripts/release/*` is a
docs/scripts-only change; it does not alter the API container or web bundle.
Deploy only a commit whose own CI run is green, and record that exact SHA.

> **Scope guard:** this gate authorizes UAT only. Production deploy remains
> NO-GO until issues #24–#28 and #30 are closed and the owner approves PR #17.
> The Railway environment linked on this machine is named `production`; it
> must not be used until the owner confirms it is the authorized UAT target.

---

## 1. Preflight (all must pass)

```sh
git fetch origin
git switch --detach <release-sha>
test -z "$(git status --porcelain)"                  # clean tree
test "$(git rev-parse HEAD)" = "<release-sha>"       # exact commit
gh run list --commit <release-sha> --limit 5         # CI green on THIS sha
gh pr view 32                                        # owner approval recorded
node scripts/release/check-env-presence.mjs --scope api --file apps/api/.env --require-feature proof
node scripts/release/check-env-presence.mjs --scope web
node scripts/release/check-env-presence.mjs --scope admin
```

`check-env-presence.mjs` prints only variable **names** and validation
reasons. Core startup/deploy variables always block. `--require-feature proof`
is used because manual payment proof is in the UAT scope; omit it only for a
deliberately reduced demo, and record that omission. Email and avatar remain
feature warnings unless added to `--require-feature`.

Local build proof for the same SHA:

```sh
pnpm install --frozen-lockfile
pnpm --filter @khabir/shared-types --filter @khabir/shared-validation build
pnpm --filter @khabir/api exec prisma generate
pnpm typecheck && pnpm lint
pnpm --filter @khabir/api test
pnpm --filter @khabir/mobile test
pnpm --filter @khabir/admin test
pnpm --filter @khabir/admin build
pnpm --filter @khabir/landing build
pnpm --filter @khabir/mobile export:web
pnpm security:audit
```

## 2. Deployment source reconciliation

### Verified provider facts (read-only, 2026-10-26)

| Provider | Verified state | Consequence |
| --- | --- | --- |
| Render blueprint (`render.yaml`) | `branch: release/v2.1.0-uat`, `healthCheckPath: /api/v1/ready`, `plan: free`, `autoDeploy: false`, Dockerfile context. Blueprint **not applied**; no service ID exists in the repo. | A blueprint deploy ships the **branch head**, not an arbitrary SHA. Exact-SHA requires the Render deploy API with `commitId` (below). Free plan is not launch-acceptable (#25). |
| Vercel project `el-khabir-uat` | Local project link exists; local metadata records `nodeVersion: 24.x`. Current production deployment has an empty title and `/_sitemap` 200 → stale. No `VERCEL_TOKEN`/session. | The provider setting is authoritative and unverified; it must be **22.x** before a release-record deployment. A CLI deploy ships the local checkout, not a server-selected commit. |
| Railway (local CLI link) | Link exists only for `D:\el-khaber-wt` — a **separate, clean worktree detached at `73cb462` (2026-10-10, 54 commits behind the RC)**. Project `pleasant-forgiveness`, service `e6d2b191-…`, environment name **`production`**. Public API domain returns `404` + `x-railway-fallback=true`. No `RAILWAY_TOKEN`. | Deploying from this link would ship an old tree to an environment named `production`. **Do not use it** until the owner confirms the target is UAT and the checkout is the approved SHA. |
| GitHub deployment history | One record: 2026-09-21, `railway-app[bot]`, environment `refreshing-creativity / production`, SHA `ae7055a` (old `main`). | This is not a V2.1 UAT deployment and must not be cited as one. |

### How an exact SHA can actually reach UAT

The app artifact is fixed only when the provider is given the commit, not a
branch name.

1. **API — Render deploy-by-commit (verified API capability).**
   `POST https://api.render.com/v1/services/{serviceId}/deploys` accepts
   `{"commitId":"<40-char SHA>"}` and returns a deploy id/status. This is the
   only declared provider path that selects an exact commit. It requires the
   blueprint to be applied first (owner approval + secrets + service ID) and
   `RENDER_API_KEY`.
2. **Web — Vercel CLI from a clean checkout.**
   `vercel deploy` uploads the local tree; it does not select a Git commit
   server-side. Run it from a clean checkout of the approved SHA and record
   `--meta khabirReleaseSha=<sha>` plus the deployment ID. Do not reuse an
   unrelated worktree.
3. **Railway — only after target authorization.**
   A CLI deploy uploads the current working directory. From a clean checkout
   of the approved SHA with an explicitly re-linked, owner-confirmed UAT
   environment it can be exact-tree, but the current local link is unsafe
   (old worktree, environment named `production`).
4. **If no provider access supports a commit/SHA deploy:** merge the approved
   candidate into `release/v2.1.0-uat`, let CI run on the **new merge/squash
   commit**, and treat that new SHA as the release. A GitHub merge does **not**
   preserve `8259709`; never record the old SHA as deployed.

`render.yaml` now points at the release branch and the readiness probe, which
prevents an accidental deploy of stale `main`. It does not, by itself, pin a
commit.

## 3. Deploy (only after preflight and owner approval)

### API — Render exact commit

```sh
# 1. Blueprint applied once (owner-approved plan/DB/secrets); capture the
#    service id from the dashboard or GET /v1/services.
export SERVICE_ID='srv-...'
export RENDER_API_KEY="$(...)"        # never echo or commit

# 2. Trigger the deploy for the exact commit, not the branch head.
DEPLOY_ID=$(curl -fsS -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"commitId\":\"<release-sha>\"}" \
  "https://api.render.com/v1/services/$SERVICE_ID/deploys" | jq -r '.id')

# 3. Poll until live; a failed migration keeps the previous version serving.
curl -fsS -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/$SERVICE_ID/deploys/$DEPLOY_ID"
```

The container CMD runs `apps/api/scripts/migrate-deploy.mjs` before serving.
Record the Render deploy id and the `commit.id` returned by the API. The free
plan sleeps; a release record requires the owner-approved paid plan (#25).

### Web — Vercel from a clean checkout

Set the project Node runtime to **22.x** in the Vercel dashboard first; the
CLI does not override the project build runtime.

```sh
git switch --detach <release-sha>
test -z "$(git status --porcelain)"
export VERCEL_TOKEN="$(...)"          # never echo or commit
vercel deploy --prod --yes --cwd apps/mobile \
  --token "$VERCEL_TOKEN" \
  --build-env EXPO_PUBLIC_API_URL=https://<api-host>/api/v1 \
  --meta khabirReleaseSha=<release-sha>
# stdout is the deployment URL; record it and inspect with:
vercel inspect <deployment-url> --token "$VERCEL_TOKEN"
```

The CLI uploads this checkout; the deployment is not evidence until its ID,
`khabirReleaseSha`, and the remote `/version` commit are recorded together.

### Railway — only with an owner-confirmed UAT environment

Do **not** use the existing local link (`D:\el-khaber-wt`, environment named
`production`, old `73cb462`). If Railway is the authorized target, re-link from
a clean checkout of the approved SHA to an explicitly confirmed UAT project/
environment, then:

```sh
railway up --service <service-id> --environment <uat-environment>
```

Record the deployment id. A deploy from the old worktree is a wrong-artifact
deploy even if it succeeds.

## 4. Post-deploy verification (read-only)

```sh
node scripts/release/uat-smoke.mjs \
  --api https://<api-host>/api/v1 \
  --web https://<web-host> \
  --expected-sha <release-sha>
```

The script **requires** `--expected-sha`; it fails when `/version` is absent,
when the commit is unknown, or when the remote commit differs from the
expected SHA. It refuses loopback/private hosts unless `--allow-local` is
passed, and that mode is labeled `local-rehearsal`. A local rehearsal PASS is
never deployment evidence. The script does not authenticate or write data.

Then confirm in a real browser (required — the served HTML is client-rendered):

- exactly one `<main>` landmark after hydration;
- `lang="ar"` and `dir="rtl"`;
- Arabic title present;
- `/_sitemap` returns 404;
- no console error other than a missing favicon;
- keyboard focus order and visible focus rings on the onboarding/register flow.

Record the browser result in issue #28. A green HTTP smoke alone is not a
visual PASS.

## 5. Rollback

- **Web:** promote the previous known-good Vercel deployment; re-run the smoke
  checks and confirm the previous title/main behavior.
- **API:** check the floor first:
  `pnpm --filter @khabir/api release:check-rollback-target <ref>`.
  The floor is `c903e06`; earlier images fail after
  `20261020091000_drop_legacy_uuid_defaults` because they insert
  `rate_limit_buckets` without `id`/`updated_at` (PostgreSQL `23502` on every
  auth-throttled route).
- **Database:** never restore over production without an incident decision.
  Follow `PRODUCTION-DATABASE-RESTORE-RUNBOOK.md`.

## 6. Credential and configuration inventory

Presence is verified by name only. Values are never printed or committed.

| Credential/config | Required service | Where to configure | Why required | Verification method | Blocking scope |
| --- | --- | --- | --- | --- | --- |
| `VERCEL_TOKEN` or dashboard session | Web UAT | Vercel dashboard / CI secret | Deploy the exact checkout and inspect the deployment | `vercel whoami`; deployment list | Web deploy |
| Vercel project Node runtime = `22.x` | Web UAT | Vercel project settings | Match `.nvmrc`/CI; currently recorded as `24.x` | Project settings read-back | Web build/provenance |
| `RENDER_API_KEY` + `SERVICE_ID` | API UAT (preferred) | Render dashboard / CI secret | Trigger `POST /services/{id}/deploys` with `commitId` | Render deploy id + `commit.id` | API deploy |
| Render paid plan + blueprint application | API UAT | Render dashboard (owner) | Free plan sleeps; blueprint not applied | Owner approval (#25) | Owner gate |
| `RAILWAY_TOKEN` + owner-confirmed UAT project/environment | API UAT (alternative) | Railway dashboard / CI secret | Exact-tree deploy; current link is old worktree + environment named `production` | Owner confirmation + `railway status` | Owner gate + API deploy |
| `DATABASE_URL` | API runtime | Provider secret store | Pooled runtime DB connection | presence check + `/ready` | API startup |
| `DIRECT_URL` | API migrations | Provider secret store | Direct DDL connection for `migrate deploy` | presence check + migration log | API startup |
| `JWT_ACCESS_SECRET` | API runtime | Provider secret store | Signs user access tokens (≥32 chars) | presence check + login smoke | API startup |
| `ADMIN_JWT_ACCESS_SECRET` | API runtime | Provider secret store | Separate admin authority (≥32 chars, different) | presence check + admin login | API startup |
| `CORS_ORIGINS` | API runtime | Provider secret store | Exact web/admin/landing origins, no `*` | presence check | Web/API integration |
| `PROOF_STORAGE_PROVIDER` + `PROOF_S3_*` | API runtime | Provider secret store | Payment proof storage; local refused in production | `--require-feature proof` + upload test | Payment proofs (declared UAT scope) |
| `AVATAR_*` (provider, bucket, keys, public base) | API runtime | Provider secret store | Profile avatars | `--require-feature avatar` | Avatars only |
| `PASSWORD_RESET_DELIVERY_URL` (+ token) | API runtime | Provider secret store | Live reset email delivery | `--require-feature email` + UAT mailbox test (#27) | Reset email only |
| `EXPO_PUBLIC_API_URL` | Web build | Vercel build env | Bakes the API origin into the export | presence check + bundle inspection | Web build |
| `NEXT_PUBLIC_API_URL` | Admin build | Admin hosting env | Bakes the API origin into the admin build | presence check | Admin build |
| `APP_VERSION` (optional) | API runtime | Provider env | Human-readable version in `/version` | response inspection | Non-blocking |
| Owner approval of PR #32 / exact SHA | Release | GitHub PR #32 | Authoritative go-ahead | Review record (currently 0 reviews) | Release gate |
| Owner acceptance of the zod waiver (`GHSA-mrhx-c7xc-m3w5`, expires 2026-11-26) | Release | `security/audit-allowlist.json` + owner record | Time-boxed risk acceptance | Owner confirmation; expiry enforced by CI | Production gate |
| Legal privacy/terms + consent | Launch | Owner/legal | Owner-only decision (#26) | signed decision | Production only |

Non-secret settings that must not be treated as credentials: `NODE_ENV`,
`PORT`, `API_GLOBAL_PREFIX`, `TRUST_PROXY_HOPS`, `REPLICAS`,
`MULTI_INSTANCE`, `RATE_LIMIT_*`, `AUTH_*` budgets, `PROOF_URL_TTL_SECONDS`,
`PROOF_MAX_BYTES`, `REQUEST_MEDIA_*`, `PASSWORD_RESET_TTL_SECONDS`.

## 7. Stop conditions

Do not deploy when any of these is true:

- the checkout SHA differs from the CI-verified SHA;
- CI is not green on that SHA;
- a blocking env name is missing (core, or a `--require-feature` you declared);
- the target host resolves to `khabir-prod` or an unverified database;
- the provider branch is `main` while the release is not merged there;
- the provider would deploy a **branch head** that is not the approved SHA and
  no `commitId`/clean-checkout path is used;
- the deployment would run from `D:\el-khaber-wt` or any environment named
  `production` without owner confirmation that it is the authorized UAT target;
- the Vercel project Node runtime is not `22.x`;
- the owner has not approved the exact SHA.

Record the stop reason in issue #28. Do not substitute a local build SHA for
the remotely deployed SHA.
