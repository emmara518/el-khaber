# الخبير — Production Deploy Runbook

**Path:** `docs/14_PRODUCTION_DEPLOY_RUNBOOK.md`
**Version:** 1.0 (2026-09-19)
**Status:** Actionable runbook. No deployment has been executed from it yet.
**Companion:** `docs/11_PRODUCTION.md` (readiness baseline), `docs/12_RELEASE.md` (release manifest).

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

Apply migrations from a machine with `DIRECT_URL` set (never via the pooler):

```sh
pnpm --filter @khabir/api prisma:migrate:deploy
pnpm --filter @khabir/api exec prisma migrate status   # expect: 7 applied, 0 pending
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
```

**BOOTSTRAPPED 2026-09-20:** `khabir-prod` exists (ref `gvobmjqxpacpmemvjbvw`,
eu-west-1, PostgreSQL 17.6, PostGIS 3.3.7, uuid-ossp 1.1, pgcrypto 1.3) with
the full 7/7 chain applied and `migrate status` clean. Platform notes learned
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
  `MULTI_INSTANCE=false`, `REPLICAS=1` (see §4).
- **Health check path:** `/api/v1/health` (liveness). Readiness: `/api/v1/ready`.
- **Pre-deploy command:** `prisma migrate deploy` (runs before each deploy).
- **Instances:** exactly **1** (see §4 — hard constraint, not a suggestion).

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

Startup log must contain `topology-notice` (single-instance declaration) and
must NOT contain `topology-fatal`.

---

## 4. Topology constraint (P1 — decided, see `docs/11_PRODUCTION.md` §7.2)

The throttler and login lockout are process-local. Until a CTO-approved shared
store exists, production runs **one instance**. The API refuses to boot with
`MULTI_INSTANCE=true` unless `SHARED_STORE_URL` is configured. The host layer
must cap replicas at 1. Reversing this decision requires a shared-store design
(e.g. Redis) + moving both guards onto it — tracked as a CTO decision, not
implemented here.

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
