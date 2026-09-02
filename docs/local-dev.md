# Al-Khabir — Local Development Setup

This document explains the exact prerequisites and commands a developer
needs to run the Al-Khabir monorepo on their machine.

It is the source of truth for the **local** development environment. It
is intentionally separate from production deployment configuration.

---

## 1. Required tooling

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 22.11.0 | Pinned in `.nvmrc`. Use `nvm`/`fnm`/nvm-windows or a portable install. |
| pnpm | 10.4.0 | The Node 22.11.0-compatible release line. Set via `corepack`. |
| PostgreSQL | 15+ (16+ recommended) | **Native install** — no Docker. Must be on `localhost:5432` (or update `DATABASE_URL`). |
| PostGIS | 3.x | PostgreSQL extension. Must be installed and enabled in the target database. |
| Git | 2.28+ | For `git init -b main`. |

PowerShell 5.1 is the shell used in the development script examples below.
On macOS/Linux, use the equivalent `bash` invocations.

> **If your environment does not have Node 22.11.0:** install it before
> running anything. The CTO-approved version is 22.11.0. Do not silently
> validate against a different version.
>
> **If PostgreSQL/PostGIS is not installed:** STOP and request the human
> to install it. Do not download or install automatically. The CTO
> amendment (Task #002) requires reusing an existing local installation
> and never downloading a second copy.

---

## 2. Enable the pinned Node + pnpm

```powershell
# Install Node 22.11.0 (skip if already present). A portable install at
#   C:\Users\<you>\AppData\Local\node-v22\node-v22.11.0-win-x64
# is recommended. Add it to the user PATH.
#
# Enable corepack so pnpm is managed per-repository.
corepack enable
corepack prepare pnpm@10.4.0 --activate

# Every shell session that runs repo commands must put Node 22.11.0 first
# on PATH. The repo expects the developer to have done this already.
$env:Path = "C:\Users\$env:USERNAME\AppData\Local\node-v22\node-v22.11.0-win-x64;$env:Path"
node --version    # MUST print: v22.11.0
pnpm --version   # MUST print: 10.4.0
```

> On macOS/Linux, the equivalent is `export PATH=/path/to/node-22.11.0/bin:$PATH`.

---

## 3. PostgreSQL + PostGIS (native)

### 3.1 Install (one-time, by the human)

- **Windows:** use the official EnterpriseDB installer
  (`https://www.postgresql.org/download/windows/`). During the wizard,
  select the **PostGIS** bundle. The default port is `5432`. Note the
  password you set for the `postgres` superuser.
- **macOS:** `brew install postgresql@16 postgis` then start the service
  with `brew services start postgresql@16`.
- **Linux (Debian/Ubuntu):** `apt install postgresql-16 postgresql-16-postgis-3`.

### 3.2 Create the development database

The application connects through `DATABASE_URL`. The `.env.example` in
`apps/api` documents the expected URL. Create the database and the
user it points to:

```sql
-- Run as the postgres superuser (psql -U postgres):
CREATE USER khabir WITH PASSWORD 'khabir_dev_password';
CREATE DATABASE khabir OWNER khabir;
\c khabir
CREATE EXTENSION IF NOT EXISTS postgis;
```

> Use a different password in your `.env`. Never commit the real
> password. The values in `apps/api/.env.example` are placeholders.

### 3.3 Verify

```sql
SELECT PostGIS_Version();
```

It should print the PostGIS version (e.g. `3.4 USE_GEOS=1 ...`). If it
fails, PostGIS is not installed correctly.

### 3.4 Healthcheck

```powershell
# Quick connectivity check
psql -U khabir -h localhost -d khabir -c "SELECT 1"
```

The `apps/api` `/api/v1/ready` endpoint also performs a connectivity
check at runtime (it does `SELECT 1` via Prisma).

---

## 4. Repository setup

```powershell
# From the repository root
pnpm install                 # installs all workspace dependencies
pnpm typecheck               # 0 errors expected
pnpm lint                    # 0 errors / 0 warnings expected
pnpm test                    # 4 unit test files, 23 tests
```

---

## 5. Database migrations and seed

```powershell
# Apply migrations (development)
pnpm --filter @khabir/api prisma:migrate:dev

# Apply migrations (staging/production only)
pnpm --filter @khabir/api prisma:migrate:deploy

# Open Prisma Studio
pnpm --filter @khabir/api prisma:studio

# Seed (Task #002 only verifies connectivity; no product seed data yet)
pnpm --filter @khabir/api db:seed
```

> `prisma db push` is intentionally NOT used. Source:
> `docs/06_DATABASE.md` and the Task #002 CTO amendment.

---

## 6. Run the API

```powershell
# Copy the example env
cp apps/api/.env.example apps/api/.env
# Edit .env and set real JWT secrets. Generate them with:
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"

# Dev server (watch)
pnpm --filter @khabir/api dev

# Or run the compiled artifact
pnpm --filter @khabir/api build
pnpm --filter @khabir/api start:prod
```

Endpoints (under `http://localhost:3000/api/v1`):

- `GET /health` — liveness
- `GET /ready` — readiness (checks the database)
- `POST /auth/register` — create a user
- `POST /auth/login` — exchange credentials for a session
- `POST /auth/refresh` — rotate the refresh token
- `POST /auth/logout` — revoke the family
- `GET /me` — current user (Bearer access token required)
- `POST /admin/auth/login` — admin login (separate authority)
- `GET /admin/me` — current admin

---

## 7. Reset procedure (development only)

```powershell
# Drop and recreate the database. This is destructive. Do not run in
# staging or production.
psql -U postgres -c "DROP DATABASE khabir;"
psql -U postgres -c "CREATE DATABASE khabir OWNER khabir;"
psql -U postgres -d khabir -c "CREATE EXTENSION IF NOT EXISTS postgis;"
pnpm --filter @khabir/api prisma:migrate:deploy
```

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `error: Node.js v22.13` from pnpm | pnpm 11+ requires Node ≥ 22.13 | Use pnpm 10.4.0 (see §2). |
| `EADDRINUSE :::3000` | Another process on port 3000 | `Get-NetTCPConnection -LocalPort 3000` to identify; set `PORT=3007` (or another free port). |
| `Can't reach database` | Wrong `DATABASE_URL` or DB not running | Verify with `psql` (§3.4). |
| PostGIS `function does not exist` | Extension not enabled | `CREATE EXTENSION IF NOT EXISTS postgis;` |
| `prisma migrate dev` warns about drift | Schema vs. migrations mismatch | Re-run `prisma migrate dev --name <change>` to regenerate. Never edit generated SQL by hand. |
| Mobile shows `auth: unknown` indefinitely | The `bootstrap()` effect never resolves | Check the device can reach `EXPO_PUBLIC_API_URL`; the default is `http://localhost:3000/api/v1` (Android emulator requires `http://10.0.2.2:3000/api/v1`). |

---

## 9. Environment variable reference

The full list of variables consumed by `apps/api` lives in
`apps/api/.env.example`. Required variables (no default):

- `DATABASE_URL`
- `JWT_ACCESS_SECRET` (≥ 32 bytes; generate with the snippet in §6)
- `ADMIN_JWT_ACCESS_SECRET` (must differ from `JWT_ACCESS_SECRET`)

Everything else has a development-friendly default in
`apps/api/src/config/app.config.ts`.

---

## 10. What this document does NOT cover

- Production deployment, CI, and hosting are out of scope for Task #002
  and will be addressed as a separate infrastructure decision per the
  CTO amendment.
- The notification provider, payment provider, and object storage
  provider remain CTO decisions. The codebase isolates each behind an
  interface so the implementation can be swapped without touching
  product code.
