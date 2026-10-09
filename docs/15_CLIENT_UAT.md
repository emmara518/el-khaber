# الخبير — Client UAT / Review Environment

**Path:** `docs/15_CLIENT_UAT.md`
**Status:** Active — client review environment (NOT production).

---

## 1. Purpose

A stable, client-accessible HTTPS version of the MVP for **UAT / review**,
backed by the **development** database. It is explicitly **not** a
production launch and **must never** point at `khabir-prod`.

## 2. Environment identity

| Field            | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| Environment      | **UAT / REVIEW** (development review)                          |
| Database         | **khabir-dev** (Supabase ref `bayahdohjsocwizxfnnq`)           |
| Production DB    | **not used** (`khabir-prod` ref `gvobmjqxpacpmemvjbvw`)        |
| Web app          | Vercel static (Expo web export)                                |
| API              | **Railway** (Trial) web service `khabir-api` — `https://khabir-api-production-f165.up.railway.app` (branch `review/final-production-release`) |
| Auth             | Real backend (`/auth/register`, `/auth/login`) — no fake auth  |

**Production safety:** the API's `DATABASE_URL` points at `khabir-dev`; the
prod ref is different and is never configured here.

## 3. URLs

- **Client UAT URL:** `https://el-khabir-uat.vercel.app` (the only UAT host;
  `khabir-uat.vercel.app` is an unrelated/404 host and must not be used).
- **API URL:** `https://khabir-api-production-f165.up.railway.app/api/v1`
  (Railway Trial). The web bundle embeds this exact `EXPO_PUBLIC_API_URL` at
  build time. (The prior local HTTPS tunnel is retired.)
- **Canonical web artifact:** `apps/mobile/dist-web` — the single output
  that `export:web` writes and that `vercel.json` (`outputDirectory`) and
  `apps/mobile/.vercelignore` (`!dist-web/**`) both reference. No other
  directory is deployed; `dist-uat` is not used.

## 4. How it is assembled (per deploy)

1. API — Railway Trial web service `khabir-api` (branch
   `review/final-production-release`), Dockerfile builder, monorepo-root
   context (`RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile`), **1 replica**
   (rate limiting / failed-login lockout are process-local — never set
   `MULTI_INSTANCE`). Deploy from a clean worktree of the release branch:

   ```sh
   railway link -p <projectId> -e production -s khabir-api
   railway up -d -y -s khabir-api
   ```

   Startup-critical env (secrets via `railway variable set … --stdin`, never
   printed): `NODE_ENV=production`, `API_GLOBAL_PREFIX=api/v1`,
   `CORS_ORIGINS=https://el-khabir-uat.vercel.app`, `DATABASE_URL`,
   `DIRECT_URL` (khabir-dev), `JWT_ACCESS_SECRET`, `ADMIN_JWT_ACCESS_SECRET`,
   `PASSWORD_RESET_DELIVERY_URL`, `PASSWORD_RESET_DELIVERY_TOKEN`,
   `PROOF_STORAGE_PROVIDER=s3` (+ `PROOF_S3_*` once R2 keys exist).

2. Endpoints: `GET /api/v1/health` (liveness) and `GET /api/v1/ready`
   (DB readiness). Base URL `https://khabir-api-production-f165.up.railway.app`.

3. Web export — bake the API URL in (apps/mobile/.env, gitignored), then
   export; deploy the static output to the existing Vercel project
   `el-khabir-uat` (not Git-linked) with the Vercel CLI:

   ```sh
   EXPO_PUBLIC_API_URL=https://khabir-api-production-f165.up.railway.app/api/v1 \
     pnpm --filter @khabir/mobile export:web       # -> apps/mobile/dist-web
   (cd apps/mobile/dist-web && vercel deploy --prod)
   ```

   Verify the live bundle embeds the API URL and contains **no**
   `trycloudflare` reference.

4. Limitations & rollback:
   - **Trial credit:** Railway Trial ($5 / time-limited); the service stops
     when credit is exhausted. Not permanent hosting.
   - **Proof/media storage:** `khabir-dev-proofs` (R2) bucket exists, but the
     `PROOF_S3_ACCESS_KEY_ID` / `PROOF_S3_SECRET_ACCESS_KEY` secrets are not
     configured → proof upload/download returns 500 (fail-closed). Core UAT
     flows do not require it.
   - **Cold start:** first request after idle is slower (container wake).
   - **Rollback:** redeploy the previous Vercel production deployment
     (`vercel rollback` / promote the prior build) and/or redeploy the prior
     Railway image; no DB or Worker change is involved.

## 5. Known limitations (client-facing)

- This is a **UAT/review environment, not production**; data is test data.
- **Web session is in-memory**: a browser reload may require logging in again
  (SecureStore has no persistent web implementation here).
- **Request photo upload is not available** (the flow states this honestly).
- **Messaging is HTTP-based, not realtime** (refresh to see new messages).
- **No checkout / order workflow**; **payment automation is not enabled**
  (manual payment → proof → review).
- **Production deployment is not active yet.**
- The API is served through a tunnel for this review; it depends on the
  review machine staying online. A permanent host is a separate decision.

## 6. Client acceptance (verified)

A fresh browser session can: open the URL → register a new customer →
land on Home → open Store → open a Product → start a merchant conversation
→ browse technicians. Verified against the live URL with the real backend.
