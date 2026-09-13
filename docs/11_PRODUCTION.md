# الخبير — Production Readiness

**Path:** `docs/11_PRODUCTION.md`
**Version:** 1.0 (Task 11E — prepared, NOT deployed)
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
2. **Multi-instance rate limiting / login lockout** — the current throttler
   and failed-login lockout are **in-memory per instance**. If production
   runs more than one API instance, limiter/lockout state is not shared and
   becomes weaker. A production-safe design needs a shared store (e.g.
   Redis), which is a provider/infrastructure decision.
3. **Notification delivery provider** (push/email/SMS) — out of scope;
   notifications are persisted only.
4. **Payment gateway** — MVP is manual transfer + Admin review; no gateway.
5. **Native release pipeline** (EAS/Play AAB signing, Android SDK) — not
   provisioned in the current environment.
6. **Object storage for service-request media** — same provider decision as
   (1).
