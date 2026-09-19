# الخبير — Production Readiness

**Path:** `docs/11_PRODUCTION.md`
**Version:** 1.1 (2026-09-19 — topology decision OPTION A recorded: single-instance; §7.2)
**Status:** Deployment preparation baseline

---

## 1. Topology

```text
Mobile (Expo / RN)  ─┐
Admin web (Next.js) ─┼──►  API (NestJS, HTTPS)  ──►  PostgreSQL + PostGIS
Landing (Next.js)   ─┘                                   (managed)
```

- The **API** is the only component with database credentials.
- **Admin** and **Landing** are static/SSR Next.js apps that call the API.
- **Mobile** talks to the API with Bearer tokens (never DB access).

---

## 2. Environments

| Environment | Purpose | Database | Notes |
|---|---|---|---|
| development | local dev | `khabir-dev` (Supabase) | `.env` gitignored |
| test | automated E2E | `khabir_test` (ephemeral Docker) | fail-closed guard, see `local-dev.md` §12 |
| production | live | dedicated managed PostgreSQL | separate project + rotated credentials |

Rules:
- Test code must never run against production.
- Each environment uses distinct JWT/admin secrets.
- `NODE_ENV=production` suppresses internal error detail in 5xx responses.

---

## 3. API deployment configuration

- **Build:** `pnpm --filter @khabir/api build` (Nest → `apps/api/dist`).
- **Start:** `node apps/api/dist/main.js` (see `apps/api/Dockerfile`).
- **Node:** `>=20.11.0` (`.nvmrc`).
- **Required env:** `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`,
  `ADMIN_JWT_ACCESS_SECRET` (must differ), `CORS_ORIGINS`,
  `NODE_ENV=production`. Full list: `apps/api/.env.example`.
- **Probes:** `GET /api/v1/health` (liveness) and `GET /api/v1/ready`
  (readiness, verifies the database).
- **CORS:** explicit allow-list only; no wildcards in production.
- **HTTPS:** terminate TLS at the platform/edge; HSTS is advertised by the
  API's security-headers middleware.
- **Logging:** one structured JSON line per request/response, correlated by
  `X-Request-Id`. No bodies, query strings, tokens, or credentials.

## 4. Database

### Migration strategy
- All schema changes are Prisma migrations under `apps/api/prisma/migrations`.
- Apply with `prisma migrate deploy` against `DIRECT_URL` (the pooler does
  not support DDL).
- Migrations are **additive and reviewed**; destructive operations require
  explicit CTO approval (docs/10 §19).
- Never `prisma migrate reset` against a shared/production database.

### Backup / restore / recovery
- Managed PostgreSQL automated daily backups + point-in-time recovery
  (Supabase feature set).
- Restore procedure: create a new instance from the backup, verify with
  `/ready`, then repoint `DATABASE_URL`/`DIRECT_URL` and redeploy.
- Recovery objective: document RPO/RTO with the CTO before launch
  (see §7 decisions).

---

## 5. Secrets

- No secret is committed. `.env*` is gitignored (only `.env.example` ships).
- Production secrets are platform-provided environment variables.
- Mobile ships only intentionally public configuration (`EXPO_PUBLIC_*`).
- Storage credentials are never in the Mobile bundle (storage is blocked —
  §7).

---

## 6. Rollback

- API: redeploy the previous image tag; migrations are additive so the prior
  app version remains compatible.
- Web: redeploy the previous Next.js build.
- Mobile: staged rollout via the store; native rollback is limited (ship a
  forward fix).

---

## 7. Open production decisions (CTO / infrastructure)

1. **Payment proof storage provider** — BLOCKED (Task 10L). No provider is
   approved; Supabase Storage is explicitly out of scope per ADR. Image
   proof cannot ship until a provider is chosen.
2. **API instance topology — DECIDED: single-instance (OPTION A,
   2026-09-19).** The throttler (`@nestjs/throttler`) and failed-login
   lockout (`LoginAttemptGuard`) are **in-memory per instance**, no Redis
   exists in this environment, and no deploy target is selected yet — so
   production runs a **SINGLE API instance (`REPLICAS=1`)**. Enforced
   where code can, documented everywhere else:
    - the API logs a `topology-notice` warning at every production boot;
    - booting with `MULTI_INSTANCE=true` and no `SHARED_STORE_URL` logs
      `topology-fatal` and exits (fail-closed against accidental
      scale-out; default boots normally);
    - `REPLICAS=1` is required in `apps/api/.env.example` and by the
      deployment configuration (no in-process replica count exists to
      enforce — the orchestrator must not scale past 1).
    **What changes this decision:** a CTO-approved shared store
    (e.g. Redis) wired into the throttler + lockout, with
    `SHARED_STORE_URL` set and `MULTI_INSTANCE=true` booting cleanly —
    only then may `REPLICAS` exceed 1.
3. **Notification delivery provider** (push/email/SMS) — out of scope;
   notifications are persisted only.
4. **Payment gateway** — MVP is manual transfer + Admin review; no gateway.
5. **Native release pipeline** — PARTIAL. The build environment provides
   OpenJDK 17 + Android SDK (platforms 33–36, build-tools 35.0.0) with no
   emulator/AVD/device and no EAS account. A local **debug QA APK** builds
   successfully (`assembleDebug`, package `ai.khabir.app`, version `0.0.1`);
   the required `expo.modules` autolink import is pinned in
   `apps/mobile/react-native.config.js` (locked Expo 52.0.49 namespace
   mismatch). Still missing: on-device/emulator QA execution, release
   signing keystore, and Play AAB (EAS/Play signing is a CTO/infra
   decision — no credentials invented).
6. **Object storage for service-request media** — same provider decision as
   (1).
