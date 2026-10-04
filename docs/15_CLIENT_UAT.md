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
| API              | Local NestJS instance on `:3100`, exposed via HTTPS tunnel     |
| Auth             | Real backend (`/auth/register`, `/auth/login`) — no fake auth  |

**Production safety:** the API's `DATABASE_URL` points at `khabir-dev`; the
prod ref is different and is never configured here.

## 3. URLs

- **Client UAT URL:** `https://el-khabir-uat.vercel.app` (the only UAT host;
  `khabir-uat.vercel.app` is an unrelated/404 host and must not be used).
- **API URL:** the HTTPS tunnel for the local API (see §4). The web bundle
  embeds `EXPO_PUBLIC_API_URL=<tunnel>/api/v1` at build time.
- **Canonical web artifact:** `apps/mobile/dist-web` — the single output
  that `export:web` writes and that `vercel.json` (`outputDirectory`) and
  `apps/mobile/.vercelignore` (`!dist-web/**`) both reference. No other
  directory is deployed; `dist-uat` is not used.

## 4. How it is assembled (per deploy)

1. Start the API against khabir-dev on `:3100`:

   ```sh
   # apps/api/.env (gitignored) must point DATABASE_URL at khabir-dev
   pnpm --filter @khabir/api build
   node apps/api/dist/main.js      # PORT defaults 3000; use 3100 for QA
   ```

   CORS must include the web origin:

   ```sh
   CORS_ORIGINS=https://el-khabir-uat.vercel.app
   ```

2. Expose the API over HTTPS (tunnel) and note the HTTPS URL.

3. Build the web export with the tunnel URL baked in:

   ```sh
   # apps/mobile/.env (gitignored)
   # EXPO_PUBLIC_API_URL=https://<tunnel>/api/v1
   pnpm --filter @khabir/mobile export:web      # -> apps/mobile/dist-web
   ```

4. Deploy the static output to Vercel (config: `apps/mobile/vercel.json`).
   The build output, `vercel.json`'s `outputDirectory`, and
   `.vercelignore` all target `dist-web`; verify the deployed bundle
   contains the intended `EXPO_PUBLIC_API_URL` before sharing the link.

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
