# UAT Deployment Gate (V2.1)

**Purpose:** one repeatable, fail-safe procedure for the authorized UAT target.
It never touches `khabir-prod`, never applies production migrations, and never
prints secret values.

**Current candidate:** `a528d94b220c0ff03bee88b47d434fe25f134718` on
`release/v2.1.0-rc-20261026`, CI run
[40368144424](https://github.com/emmara518/el-khaber/actions/runs/40368144424)
— success. See `docs/releases/V2.1.0-RC-20261026.md`.

> **Scope guard:** this gate authorizes UAT only. Production deploy remains
> NO-GO until issues #24–#28 and #30 are closed and the owner approves PR #17.

---

## 1. Preflight (all must pass)

```sh
git fetch origin
git switch --detach <release-sha>
test -z "$(git status --porcelain)"                  # clean tree
test "$(git rev-parse HEAD)" = "<release-sha>"       # exact commit
gh run list --commit <release-sha> --limit 5         # CI green on THIS sha
node scripts/release/check-env-presence.mjs --scope api --file apps/api/.env
node scripts/release/check-env-presence.mjs --scope web
node scripts/release/check-env-presence.mjs --scope admin
```

`check-env-presence.mjs` prints only variable **names** and validation
reasons. Missing blocking names must stop the deploy.

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

| Provider | Declared source | Required setting |
| --- | --- | --- |
| Render blueprint (`render.yaml`) | `branch: main` | **Change to `release/v2.1.0-uat`** (or deploy the exact SHA). `main` does not contain the V2.1 release work. Production may move to `main` only after PR #17 is merged and the merged SHA is re-verified. |
| Render health probe | `/api/v1/health` | **Change to `/api/v1/ready`** so the platform gates on database + migrations + schema, not just process liveness. |
| Render plan | `free` | **Blocked for production** until the owner approves an always-on paid plan (#25). Free-tier sleep is acceptable only for an explicitly labeled ephemeral UAT demo, never for a release record. |
| Vercel project `el-khabir-uat` | no Git metadata on the current deployment | Deploy by exact SHA with `vercel deploy --prod --yes` from the verified tree, then record the deployment ID. |
| Vercel Node runtime | project setting `24.x` | **Change to `22.x`** to match `.nvmrc` (`22.11.0`) and CI. |
| Railway UAT API | domain returns `x-railway-fallback=true` (no active deployment) | Recreate/redeploy the service from the verified SHA, or retire the domain and use Render. Do not record the current domain as a deployment. |

`render.yaml` in this candidate already sets `healthCheckPath` to
`/api/v1/ready` and the branch to the release branch. The blueprint is not
applied automatically (`autoDeploy: false`).

## 3. Deploy

### API

Render blueprint (after owner approves plan/DB/secrets):

```sh
render blueprint launch            # or apply from the dashboard
# Container CMD runs apps/api/scripts/migrate-deploy.mjs before serving.
```

Railway alternative: deploy the Dockerfile from the verified SHA, one replica,
and set `REPLICAS=1`. Do not introduce Redis or multi-instance mode.

### Web

```sh
pnpm --filter @khabir/mobile export:web
vercel deploy --prod --yes --cwd apps/mobile \
  --build-env EXPO_PUBLIC_API_URL=https://<api-host>/api/v1
```

Record: deployment ID, source SHA, CI run, timestamp, operator.

## 4. Post-deploy verification (read-only)

```sh
node scripts/release/uat-smoke.mjs \
  --api https://<api-host>/api/v1 \
  --web https://<web-host> \
  --expected-sha <release-sha>
```

The script fails on a commit mismatch or an unreachable health/readiness
endpoint. It does not authenticate or write data.

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
| Vercel account/project access | Web UAT | Vercel dashboard / `VERCEL_TOKEN` in CI | Deploy and inspect exact-SHA web artifact | `vercel whoami`, deployment list | Web deploy |
| Railway or Render account access | API UAT | Provider dashboard / CI secret | Deploy API image and inspect deployment metadata | `railway status` / Render dashboard | API deploy |
| `DATABASE_URL` | API runtime | Provider secret store | Pooled runtime DB connection | presence check + `/ready` | API startup |
| `DIRECT_URL` | API migrations | Provider secret store | Direct DDL connection for `migrate deploy` | presence check + migration log | API startup |
| `JWT_ACCESS_SECRET` | API runtime | Provider secret store | Signs user access tokens (≥32 chars) | presence check + login smoke | API startup |
| `ADMIN_JWT_ACCESS_SECRET` | API runtime | Provider secret store | Separate admin authority (≥32 chars, different) | presence check + admin login | API startup |
| `CORS_ORIGINS` | API runtime | Provider secret store | Exact web/admin/landing origins, no `*` | presence check | API startup |
| `PROOF_STORAGE_PROVIDER` | API runtime | Provider config | `s3` in production; local is refused | presence check | Payment proofs |
| `PROOF_S3_BUCKET`, `PROOF_S3_ACCESS_KEY_ID`, `PROOF_S3_SECRET_ACCESS_KEY` | API runtime | Provider secret store | Private payment-proof bucket | presence check + upload test | Payment proofs |
| `AVATAR_*` (provider, bucket, keys, public base) | API runtime | Provider secret store | Profile avatars | presence check | Avatars only |
| `PASSWORD_RESET_DELIVERY_URL` (+ optional token) | API runtime | Provider secret store | Live reset email delivery | presence check + UAT mailbox test (#27) | Reset email only |
| `EXPO_PUBLIC_API_URL` | Web build | Vercel build env | Bakes the API origin into the export | presence check + bundle inspection | Web build |
| `NEXT_PUBLIC_API_URL` | Admin build | Admin hosting env | Bakes the API origin into the admin build | presence check | Admin build |
| `APP_VERSION` (optional) | API runtime | Provider env | Human-readable version in `/version` | response inspection | Non-blocking |
| GitHub environment approval | Release | GitHub repo settings | Owner approval of the exact SHA | PR review record | Release gate |
| Legal privacy/terms + consent | Launch | Owner/legal | Owner-only decision (#26) | signed decision | Production only |

Non-secret settings that must not be treated as credentials: `NODE_ENV`,
`PORT`, `API_GLOBAL_PREFIX`, `TRUST_PROXY_HOPS`, `REPLICAS`,
`MULTI_INSTANCE`, `RATE_LIMIT_*`, `AUTH_*` budgets, `PROOF_URL_TTL_SECONDS`,
`PROOF_MAX_BYTES`, `REQUEST_MEDIA_*`, `PASSWORD_RESET_TTL_SECONDS`.

## 7. Stop conditions

Do not deploy when any of these is true:

- the checkout SHA differs from the CI-verified SHA;
- CI is not green on that SHA;
- a blocking env name is missing;
- the target host resolves to `khabir-prod` or an unverified database;
- the provider branch is `main` while the release is not merged there;
- the owner has not approved the exact SHA.

Record the stop reason in issue #28. Do not substitute a local build SHA for
the remotely deployed SHA.
