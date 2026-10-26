# Production Environment Matrix (V2.1)

**Status:** deployment checklist for owner/DevOps. No secrets are recorded
here. Production values are **NOT VERIFIED** until issue #25 records the
platform setup evidence.
**Release:** `release/v2.1.0-uat` @
`739f9ebc964d0415686f1827942d8b07a3f70c30`
**Verified candidate (not merged):** `a528d94b220c0ff03bee88b47d434fe25f134718`
on `release/v2.1.0-rc-20261026` — see `V2.1.0-RC-20261026.md`

## Runtime

| Variable | Requirement | Validation / notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Enables production logging/topology notices |
| `PORT` | host-provided | Do not hard-code a public port |
| `API_GLOBAL_PREFIX` | `api/v1` | Keep clients and health checks aligned |
| `CORS_ORIGINS` | exact web/admin/landing origins | Comma-separated; no wildcards |
| `TRUST_PROXY_HOPS` | `1` | Numeric; one trusted proxy hop; update only if topology changes |
| `REPLICAS` | `1` for launch | General HTTP throttle is per-instance; login lockout is PostgreSQL-backed |
| `MULTI_INSTANCE` | `false` for launch | Informational topology log; do not claim horizontal scale |
| `APP_VERSION` | optional | Human-readable version returned by `/api/v1/version`; non-sensitive |
| `GIT_COMMIT_SHA` | optional | Build identity for `/api/v1/version`; Render/Railway/Vercel inject their own equivalents automatically. Never a secret |

## Database

| Variable | Requirement | Validation / notes |
| --- | --- | --- |
| `DATABASE_URL` | pooled runtime URL for the dedicated production DB | Must not point at `khabir-dev`; never print value |
| `DIRECT_URL` | direct/session-mode DDL URL | Required for migrations; must not be a transaction pooler |

## Authentication

| Variable | Requirement | Validation / notes |
| --- | --- | --- |
| `JWT_ACCESS_SECRET` | >=32 chars, random, production-only | App fails fast if missing/short |
| `ADMIN_JWT_ACCESS_SECRET` | >=32 chars, different from user secret | App fails if equal/short |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | approved values | Defaults exist; record chosen values |
| `ADMIN_JWT_ACCESS_TTL` / `ADMIN_JWT_REFRESH_TTL` | approved values | Defaults exist |
| `JWT_ISSUER` / `JWT_AUDIENCE` | `khabir-api` / `khabir` | Must match clients |
| `ADMIN_JWT_ISSUER` / `ADMIN_JWT_AUDIENCE` | `khabir-admin-api` / `khabir-admin` | Must match admin client |

## Storage (payment proof and avatars)

| Variable | Requirement | Validation / notes |
| --- | --- | --- |
| `PROOF_STORAGE_PROVIDER` | `s3` in production | Local adapter is refused in production |
| `PROOF_S3_BUCKET` / `PROOF_S3_REGION` / `PROOF_S3_ENDPOINT` | private proof bucket | Endpoint omitted for AWS |
| `PROOF_S3_ACCESS_KEY_ID` / `PROOF_S3_SECRET_ACCESS_KEY` | least-privilege server key | Never expose to clients |
| `AVATAR_STORAGE_PROVIDER` | `s3` in production | Public-read `avatars/*` only |
| `AVATAR_S3_*` / `AVATAR_PUBLIC_BASE_URL` | avatar bucket/CDN | Never mix with proof bucket prefix |

## Email password reset

| Variable | Requirement | Validation / notes |
| --- | --- | --- |
| `PASSWORD_RESET_DELIVERY_URL` | approved email/SMS gateway webhook | Missing = deferred no-op; live delivery is BLOCKED |
| `PASSWORD_RESET_DELIVERY_TOKEN` | optional bearer token | Never print value |

## Build-time web

| Variable | Requirement | Validation / notes |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | production HTTPS API base (`/api/v1`) | Baked into web export; never localhost/LAN |

## Owner/DevOps evidence

- Variable **names** present in the platform secret store (never values).
- Host/provider/plan and single-instance acceptance.
- Health/readiness probe URLs and alert owner.
- Secret rotation runbook and rotation date.
- Confirmation that no client bundle contains server secrets.

Tracked in issue [#25](https://github.com/emmara518/el-khaber/issues/25).
