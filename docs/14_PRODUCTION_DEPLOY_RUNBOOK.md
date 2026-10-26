# الخبير — Production Deploy Runbook

> **Current status (2026-10-21): historical baseline, not production-verified.**
> The last merged release is `739f9ebc964d0415686f1827942d8b07a3f70c30`; the
> verified remediation candidate is
> `a528d94b220c0ff03bee88b47d434fe25f134718` (see
> `docs/releases/V2.1.0-RC-20261026.md`) and is not merged yet. Production
> database/secrets/hosting/legal gates are still open. Use the current
> `docs/releases/V2.1.0-RELEASE-GATE.md`,
> `docs/releases/PRODUCTION-DATABASE-RESTORE-RUNBOOK.md`, and
> `docs/releases/DEPLOYMENT-PROVENANCE-AND-ROLLBACK.md` for the current
> procedures. Do not assume any historical claim in this file about a
> `khabir-prod` database is still true; this engineering session did not
> access it.

**Path:** `docs/14_PRODUCTION_DEPLOY_RUNBOOK.md`
**Version:** 1.0 (2026-09-19)
**Status:** Historical reference. No deployment has been executed from it yet.
**Companion:** `docs/11_PRODUCTION.md` (readiness baseline),
`docs/releases/V2.1.0-RELEASE-GATE.md` (current gate).

This runbook is the only in-session deliverable for the deployed-API blocker:
there is no prod Supabase project, no container-host account, and no prod
secrets in this environment, so no real deployment could be executed here.
Every step below names its EXACT required input. Nothing is invented.

---

## 0. Prerequisites (all external — owner/CTO provides)

| #   | Input                                                                                         | Source                                                                           |
| --- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | Supabase account + new project `khabir-prod` (region TBD)                                     | Supabase dashboard                                                               |
| 2   | `khabir-prod` DB password + `CREATE EXTENSION postgis;` + dedicated prod Prisma user/password | Supabase dashboard + SQL editor                                                  |
| 3   | Prod pooled `DATABASE_URL` (port 6543, `?pgbouncer=true`)                                     | Supabase → Connect                                                               |
| 4   | Prod direct `DIRECT_URL` (port 5432, DDL-capable)                                             | Supabase → Connect                                                               |
| 5   | `JWT_ACCESS_SECRET` (≥32 random bytes, prod-only)                                             | `node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"` |
| 6   | `ADMIN_JWT_ACCESS_SECRET` (different value, prod-only)                                        | same generator                                                                   |
| 7   | `CORS_ORIGINS` (prod admin origin, prod landing origin — no wildcards)                        | product decision                                                                 |
| 8   | Container host account (Render recommended — free tier suffices; Fly.io/Railway equivalent)   | host dashboard                                                                   |
| 9   | S3-compatible storage for payment proof (bucket, region, endpoint, key pair)                  | storage decision (see §5)                                                        |
| 10  | Android production upload keystore + 4 `MYAPP_UPLOAD_*` secrets                               | Play Console / owner (see `docs/android-release-signing.md`)                     |

Admin/Landing deploy separately (static/SSR hosts, e.g. Vercel). The mobile
release embeds `EXPO_PUBLIC_API_URL` = the API URL from step 11.

---

## 1. Database (Supabase `khabir-prod`)

```sql
create extension if not exists postgis;
-- dedicated least-privilege Prisma user (see docs/local-dev.md §DB pattern)
```

Apply migrations from a machine with `DIRECT_URL` set (never via the pooler),
or rely on the in-container migration gate (see §2 — it applies pending
migrations automatically before each deploy, fail-closed):

```sh
pnpm --filter @khabir/api exec prisma migrate status   # tree contains 27; verify actual target, 0 pending
```

Expected migration chain (additive, non-destructive):

```text
20260101000000_init_identity
20260910000000_domain_foundation
20260911000000_technician_service_areas
20260912000000_payments_and_grants
20260913000000_technician_self_service
20260914000000_location_coordinates_optional
20260915000000_payment_proof_metadata
20260916000000_merchant_product_conversations
20261008000000_enable_public_rls
20261010000000_add_token_version
20261011000000_rate_limit_buckets
20261011000001_rate_limit_buckets_rls
20261011202423_revoke_rate_limit_buckets_client_acl
20261013000000_notification_preferences
20261017000000_notification_preferences_hardening
20261020090000_schema_consistency_defaults
20261020091000_drop_legacy_uuid_defaults
20261020092000_align_relation_on_update
20261022100000_email_change_verification
20261022110000_public_acl_hardening
20261022120000_payment_snapshot_idempotency
20261022130000_service_fault_category_integrity
20261022140000_conversation_initiator_integrity
20261022150000_rate_limit_prune_index
20261022160000_money_coordinate_checks
20261022170000_query_indexes
20261022180000_status_timestamp_invariants
```

**Historical bootstrap (2026-09-20):** the old project note recorded a
partially applied chain. That statement is historical and MUST NOT be used to
infer the current production state. The repository now contains 27
migrations; `prisma migrate status` against the actual target is the only
authority. Production migration state is **NOT VERIFIED** by this audit.
Do not deploy an image that predates `c903e06` after the
`20261020091000` default-drop migration (see the rollback floor check).

Platform notes learned
during bootstrap: direct `db.<ref>.supabase.co:5432` is IPv6-only from most
networks — run all DDL through the session-mode pooler
`aws-1-eu-west-1.pooler.supabase.com:5432` (transaction pooler `:6543` is
runtime-only); new projects install extensions into the `extensions` schema,
so the migration role needs `search_path = public, extensions` plus
`USAGE ON SCHEMA extensions` (in addition to the §3 user/grants pattern).
Seed: do NOT run dev/QA seeds against prod. Create the admin operator via the
documented admin-bootstrap path only.

---

## 2. API service (Render Web Service from `apps/api/Dockerfile`)

- **Repo:** `emmara518/el-khaber`, branch `main` (after this release is merged).
- **Build:** Docker, context = repo root (`apps/api/Dockerfile` expects the monorepo).
- **Runtime:** `NODE_ENV=production`, `PORT` (host-provided), `API_GLOBAL_PREFIX=api/v1`.
- **Env:** `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, `ADMIN_JWT_ACCESS_SECRET`,
  `CORS_ORIGINS`, `PROOF_STORAGE_PROVIDER=s3` + `PROOF_S3_*` (see §5),
  `TRUST_PROXY_HOPS=1` (AUD-007 — one Render proxy hop; keep in sync with the
  actual proxy topology), `REPLICAS=1` (see §4).
- **Health check path:** `/api/v1/health` (liveness). Readiness: `/api/v1/ready`.
- **Migrations gate (AUD-003):** `apps/api/Dockerfile` CMD wraps the start with
  `node apps/api/scripts/migrate-deploy.mjs` — pending migrations are applied
  BEFORE the API binds traffic; any failure exits non-zero so Render refuses
  the deploy and the previous version stays live. Preflight locally with
  `node apps/api/scripts/migrate-deploy.mjs --preflight` (validates schema,
  CLI, env presence and migration chain with NO database contact).
  **Paid-plan upgrade path:** Render's `preDeployCommand` is supported on paid
  plans only; when the web service plan is upgraded, move the gate:
  `preDeployCommand: node apps/api/scripts/migrate-deploy.mjs` and revert CMD
  to `node apps/api/dist/main.js`.
- **autoDeploy risk (operational, documented — not changed by the agent):**
  `render.yaml` has `autoDeploy: true` on the release branch. Until the
  pending un-committed work is committed, pushing the OLD reviewed HEAD would
  publish a tree older than the reviewed/corrected working tree. Before
  enabling autodeploys on the old identity: either commit this security batch
  first or set autoDeploy to false in the Render dashboard.
- **Instances:** exactly **1** for the initial release (see §4).

---

## 3. Verify the deployment

```sh
API=https://<render-service>.onrender.com/api/v1
curl -sf $API/health                                     # {"data":{"status":"ok",...}}
curl -sf $API/ready                                      # {"data":{"status":"ready",...}}
curl -sf $API/appliance-categories | head -c 200         # public catalog rows
curl -s -o /dev/null -w '%{http_code}\n' $API/me         # 401 (auth enforced)
curl -s -o /dev/null -w '%{http_code}\n' -X POST $API/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"nobody@example.com","password":"wrong"}' # 401, canonical error
```

Startup log must contain the `startup` line with `trustProxyHops: 1`, a
`proxy-trust-notice`, and the `topology-notice` (rate limiting and failed-login
lockout are PostgreSQL-backed — multi-instance is supported; SHARED_STORE_URL
is legacy/unused). No `topology-fatal` event exists anymore.

---

## 4. Topology (updated — DB-backed shared store)

Rate limiting (fixed window on `rate_limit_buckets`) and failed-login lockout
are **PostgreSQL-backed via Prisma** (shared store). Horizontal scaling is
supported at the application level; `MULTI_INSTANCE=true` is safe boot-like
configuration. `SHARED_STORE_URL` is legacy/unused and may be removed from
deploy configs. Note the free plan still only provides ONE instance; scaling
beyond one instance is a paid-plan operation. Keep `REPLICAS=1` for the
initial release as an operational choice, not a correctness constraint.

---

## 5. Payment proof storage (P0 — code-complete, credentials pending)

Implemented (fail-closed without credentials): `POST /subscriptions/:id/proof-upload-url`,
`POST /subscriptions/:id/proof-confirm`, `GET /admin/payments/submissions/:id/proof-url`.
Set in the API environment (never `EXPO_PUBLIC_*`):

```sh
PROOF_STORAGE_PROVIDER=s3
PROOF_S3_BUCKET=<bucket>
PROOF_S3_REGION=<region>            # default us-east-1
PROOF_S3_ENDPOINT=<endpoint>        # S3-compatible only; omit for AWS
PROOF_S3_ACCESS_KEY_ID=<key>
PROOF_S3_SECRET_ACCESS_KEY=<secret>
PROOF_URL_TTL_SECONDS=300           # default
PROOF_MAX_BYTES=5242880             # default 5 MB
```

Bucket policy: private objects only (`payment-proofs/{userId}/{submissionId}/{uuid}.{ext}`),
access exclusively via short-lived presigned URLs. MIME allowlist
(jpeg/png/webp) + magic-byte verification enforced server-side on confirm.

---

## 6. Mobile release against the deployed API

```sh
export EXPO_PUBLIC_API_URL=https://REAL-API/api/v1
export MYAPP_UPLOAD_STORE_FILE=/path/to/khabir-upload.keystore
export MYAPP_UPLOAD_STORE_PASSWORD=… MYAPP_UPLOAD_KEY_ALIAS=… MYAPP_UPLOAD_KEY_PASSWORD=…
./apps/mobile/android/gradlew -p apps/mobile/android assembleRelease bundleRelease
```

Verify: `apksigner verify`, aapt2 badging (`ai.khabir.app`, versionCode/Name),
`EXPO_PUBLIC_API_URL` embedded exactly once pointing at HTTPS (never
localhost/`10.0.2.2`/LAN IP). Release network policy denies cleartext.
Install the APK clean (`adb uninstall` first) and execute the §7 flows.

---

## 7. Go-live smoke (all against the DEPLOYED api — never localhost)

Customer (register→login→home→fault guide→discovery→request→tracking→
subscription→notification→logout→login), Technician (login→dashboard→
availability→accept→start→complete→logout), Merchant (login→dashboard→
product CRUD→subscription payment + proof upload→logout), Admin (login→
dashboard→verifications→service requests→payment review approve/reject→
grants→notifications→audit log). Payment proof: upload → admin secure view →
reject → resubmit → approve → entitlement ACTIVE.

---

## 8. Admin provisioning and QA seed safety (V2.1)

### Create an admin (out-of-band only)

There is no public admin-registration endpoint. Provision from an interactive TTY:

``sh
cd apps/api
ALLOW_ADMIN_CREATE=true pnpm admin:create
``sh

- The password is typed with echo disabled; it is never accepted from argv,
  an environment variable, or piped stdin.
- Minimum 14 characters with at least one letter and one digit.
- Role must be one of: super_admin, operations_admin, content_admin,
  support_admin. The legacy finance_admin value cannot be provisioned.
- Creation writes an admin.provision.create row to the audit log.
- Never paste the password into a ticket, chat, or shell history.

### Seed / QA scripts

Every seed and QA write script requires ALL of:

1. ALLOW_QA_SEED=true (explicit per-run opt-in),
2. NODE_ENV not equal to production,
3. a DATABASE_URL whose parsed host is loopback, postgres (CI), or
   	est-db (docker-compose). Supabase/shared hosts are always rejected.

The guard lives in pps/api/scripts/qa-guard.cjs; it is not a URL substring
check. Use docker-compose.test.yml for a disposable local database.

### QA account purge (approval required)

pps/api/scripts/purge-qa-accounts.ts only inspects @qa.khabir.app`naccounts by default. It deletes only when ALLOW_QA_PURGE=true is set AND
--confirm is passed, and it refuses production. A human owner must approve
the action before it is run.

