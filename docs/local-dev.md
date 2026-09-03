# Al-Khabir — Local Development Setup

This document explains the exact prerequisites and commands a developer
needs to run the Al-Khabir monorepo on their machine.

It is the source of truth for the **local** development environment. It
is intentionally separate from staging and production configuration.

> **Architectural decision:** the platform database is
> **Supabase-managed PostgreSQL** with the **PostGIS** extension. The
> application architecture (NestJS → Prisma → Supabase) is unchanged.
> The mobile app **never** connects directly to Supabase; it talks
> to the NestJS API only. See
> [`docs/adr/0004-supabase-postgres.md`](adr/0004-supabase-postgres.md).

---

## 1. Required tooling

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 22.11.0 | Pinned in `.nvmrc`. Use `nvm` / `fnm` / nvm-windows or a portable install. |
| pnpm | 10.4.0 | The Node-22.11.0-compatible release line. Set via `corepack`. |
| Supabase project | n/a | One project per environment (development, staging, production). |
| Supabase CLI (optional) | latest | Helpful for SQL scripts and migrations; not required. |
| Git | 2.28+ | For `git init -b main`. |

> **If your environment does not have Node 22.11.0:** install it
> before running anything. The CTO-approved version is 22.11.0. Do
> not silently validate against a different version.

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

> On macOS/Linux, the equivalent is
> `export PATH=/path/to/node-22.11.0/bin:$PATH`.

---

## 3. Database — Supabase (managed PostgreSQL + PostGIS)

### 3.1 Create a Supabase project

1. Sign in to <https://supabase.com/dashboard>.
2. **New project** → choose a name (e.g. `khabir-dev`), a strong
   database password, and the closest region. Record the password in
   your password manager.
3. Once the project is provisioned, go to **Project Settings →
   Database → Connection string**. Note the three connection modes:
   - **Direct** (port 5432) — used by Prisma migrations.
   - **Transaction** pooler (port 6543) — recommended for serverless
     or low-concurrency workloads.
   - **Session** pooler (port 5432) — recommended for long-lived
     servers (the NestJS API).
4. Choose the **Session** pooler for the application runtime unless
   the team prefers the Transaction pooler. The exact hostname,
   port, user, and password are shown in the dashboard.

### 3.2 Enable PostGIS

PostGIS is enabled per project. From the Supabase dashboard:

1. Open **SQL Editor** → **New query**.
2. Run:

   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

3. Verify:

   ```sql
   SELECT PostGIS_Version();
   ```

   The result is the installed PostGIS version (e.g. `3.4 USE_GEOS=1
   ...`). The `geography(Point, 4326)` type, `ST_DWithin`, and GIST
   spatial indexes are now available. The `prisma migrate deploy`
   migration will execute the same `CREATE EXTENSION` against
   staging and production so the schema is consistent.

### 3.3 Create a dedicated Prisma database user (recommended)

Using the Supabase project owner (`postgres`) for the application is
discouraged. Create a dedicated user:

1. **SQL Editor → New query** (as project owner):

   ```sql
   -- Replace <STRONG_PASSWORD> with a strong unique password.
   CREATE USER khabir_prisma WITH PASSWORD '<STRONG_PASSWORD>';
   GRANT CONNECT ON DATABASE postgres TO khabir_prisma;
   GRANT USAGE ON SCHEMA public TO khabir_prisma;
   -- Migrations need to create / alter tables during development.
   GRANT CREATE ON DATABASE postgres TO khabir_prisma;
   GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO khabir_prisma;
   GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO khabir_prisma;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     GRANT ALL PRIVILEGES ON TABLES TO khabir_prisma;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public
     GRANT ALL PRIVILEGES ON SEQUENCES TO khabir_prisma;
   ```

2. Record the username (`khabir_prisma`) and password in the
   password manager.

> For production Supabase projects, restrict the Prisma user to the
> minimum set of privileges the application actually needs.

### 3.4 Configure `apps/api/.env`

```powershell
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and fill in the real values.
```

Set the following:

- `DATABASE_URL` — the **Session pooler** URI from the Supabase
  dashboard, using the `khabir_prisma` user. Example:
  `postgresql://khabir_prisma:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres`
- `DIRECT_URL` — the **Direct** URI from the dashboard, using the
  `khabir_prisma` user. Example:
  `postgresql://khabir_prisma:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres` (same as above but
  with `?pgbouncer=false` or no pooler, depending on the Supabase
  plan output).
- `JWT_ACCESS_SECRET` — strong random ≥ 32 bytes. Generate with
  `node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"`.
- `ADMIN_JWT_ACCESS_SECRET` — different from the user secret.
- `CORS_ORIGINS` — comma-separated. For local dev:
  `http://localhost:3001,http://localhost:3002,http://localhost:8081`.
- All other variables per `apps/api/.env.example`.

**Never commit `apps/api/.env` or paste the connection string
anywhere outside your own machine.** Only `apps/api/.env.example` is
tracked in git.

### 3.5 Verify

```powershell
cd D:\el-khaber
pnpm install
pnpm --filter @khabir/api prisma:generate
pnpm --filter @khabir/api prisma:migrate:deploy
```

The `migrate:deploy` command prints a list of applied migrations and
exits 0. Verify the schema with the Supabase SQL editor:

```sql
\dt
```

You should see: `users`, `refresh_tokens`, `password_reset_tokens`,
`admin_users`, `admin_refresh_tokens`, and the `_prisma_migrations`
table. Then verify PostGIS:

```sql
SELECT PostGIS_Version();
```

### 3.6 Runtime readiness

The API's `GET /api/v1/ready` performs a `SELECT 1` via Prisma. With
the correct `DATABASE_URL` it returns
`200 {"data":{"status":"ready","checks":{"database":"ok"}}}`.
Without it, the endpoint returns `503` with the canonical error
envelope.

---

## 4. Environment separation

Three sets of secrets, one per environment:

| Variable | development | staging | production |
| --- | --- | --- | --- |
| Supabase project | `khabir-dev` | `khabir-staging` | `khabir-prod` |
| `DATABASE_URL` | session pooler, dev project | session pooler, staging project | session pooler, prod project |
| `DIRECT_URL` | direct, dev project | direct, staging project | direct, prod project |
| `JWT_ACCESS_SECRET` | dev secret | staging secret | prod secret |
| `ADMIN_JWT_ACCESS_SECRET` | dev secret | staging secret | prod secret |

Rules:

- Secrets are stored in the deployment platform's secret manager
  (GitHub Actions secrets, Vercel/Railway env, AWS Secrets Manager,
  etc.). Never in source.
- Production secrets are never used in development or staging.
- `DATABASE_URL` and server secrets are **never** placed in Expo
  public environment variables (`EXPO_PUBLIC_*`). The mobile bundle
  only sees the public API URL.
- The mobile app talks to the NestJS API. It never connects to
  Supabase directly.

---

## 5. Repository setup

```powershell
# From the repository root
pnpm install                 # installs all workspace dependencies
pnpm typecheck               # 0 errors expected
pnpm lint                    # 0 errors / 0 warnings expected
pnpm test                    # 4 unit test files, 40 tests (auth e2e + unit)
```

---

## 6. Database migrations and seed

```powershell
# Apply migrations (development)
pnpm --filter @khabir/api prisma:migrate:dev

# Apply migrations (staging/production only)
pnpm --filter @khabir/api prisma:migrate:deploy

# Open Prisma Studio (connects via DATABASE_URL)
pnpm --filter @khabir/api prisma:studio

# Seed (Task #002 only verifies connectivity; no product seed data yet)
pnpm --filter @khabir/api db:seed
```

> `prisma db push` is intentionally NOT used. See
> `docs/06_DATABASE.md` and the Task #002 CTO amendment.

---

## 7. Run the API

```powershell
# Dev server (watch)
pnpm --filter @khabir/api dev

# Or run the compiled artifact
pnpm --filter @khabir/api build
pnpm --filter @khabir/api start:prod
```

Endpoints (under `http://localhost:3000/api/v1`):

- `GET /health` — liveness
- `GET /ready` — readiness (database check via Prisma)
- `POST /auth/register` — create a user
- `POST /auth/login` — exchange credentials for a session
- `POST /auth/refresh` — rotate the refresh token
- `POST /auth/logout` — revoke the family
- `GET /me` — current user (Bearer access token)
- `POST /admin/auth/login` — admin login (separate authority)
- `GET /admin/me` — current admin

---

## 8. E2E test database

The auth e2e suite (`apps/api/test/auth.e2e.spec.ts`) is wired
against the compiled `dist/` and overrides the `PrismaService` with
an in-memory `FakePrismaClient`. The fake is a **test-only** seam
that covers the schema surface the auth flow touches (users,
refresh tokens, password reset tokens, admin users, admin refresh
tokens). The fake is **not** a substitute for real persistence.

Per the CTO amendment, the e2e suite must be exercised against a
**dedicated, isolated Supabase test project / test database** before
it can be considered a real-database test. Until that isolated test
project is available, the suite runs against the fake. The fake
must never be used to mutate production data — it cannot reach any
external service because the override removes the real `PrismaService`
from the test container.

To switch the e2e to a real Supabase test database:

1. Create a separate Supabase project (e.g. `khabir-test`).
2. Enable PostGIS on it.
3. Create a dedicated `khabir_test` database user.
4. Set `DATABASE_URL` and `DIRECT_URL` in a test-only `.env` or in
   the CI secret store.
5. Replace the `useValue(prisma)` override in
   `apps/api/test/auth.e2e.spec.ts` with the real `PrismaService`
   and add a per-test cleanup (truncate the relevant tables in
   `beforeEach` or use a transaction-rolled-back shared connection).
6. Document the change in the next task report.

---

## 9. Reset procedure (development only)

A Supabase project cannot be "reset" the way a local install can.
Use the Supabase dashboard to:

- **Restore** the project to a point in time (paid plans).
- **Drop and recreate** specific tables via the SQL editor:

  ```sql
  DROP TABLE IF EXISTS refresh_tokens CASCADE;
  DROP TABLE IF EXISTS password_reset_tokens CASCADE;
  DROP TABLE IF EXISTS users CASCADE;
  DROP TABLE IF EXISTS admin_refresh_tokens CASCADE;
  DROP TABLE IF EXISTS admin_users CASCADE;
  -- Then re-apply migrations:
  --   pnpm --filter @khabir/api prisma:migrate:deploy
  ```

- Or create a **fresh** Supabase project for a clean slate.

Do not run destructive SQL on the staging or production Supabase
projects.

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Error: P1001: Can't reach database server` | Wrong `DATABASE_URL` or Supabase project paused | Verify the connection string in the Supabase dashboard. Unpause the project if needed. |
| `Error: P1000: Authentication failed` | Wrong user or password in `DATABASE_URL` | Reset the Prisma user's password and update `.env`. |
| `relation "users" does not exist` | Migrations not applied | `pnpm --filter @khabir/api prisma:migrate:deploy`. |
| `function postgis_version() does not exist` | PostGIS not enabled | Run `CREATE EXTENSION IF NOT EXISTS postgis;` in the SQL editor. |
| `prisma migrate dev` warns about drift | Schema vs. migrations mismatch | Re-run `prisma migrate dev --name <change>` to regenerate. Never edit generated SQL by hand. |
| `/ready` returns 503 in production | `DIRECT_URL` or `DATABASE_URL` incorrect, or Supabase paused | Verify the connection strings and the project status. |
| Mobile shows `auth: unknown` indefinitely | The `bootstrap()` effect never resolves | Check the device can reach `EXPO_PUBLIC_API_URL`; the default is `http://localhost:3000/api/v1` (Android emulator requires `http://10.0.2.2:3000/api/v1`). |

---

## 11. What this document does NOT cover

- Production deployment, CI, and hosting are out of scope for this
  task and will be addressed as a separate infrastructure decision
  per the Task #002 CTO amendment.
- The notification provider, payment provider, and object storage
  provider remain CTO decisions. The codebase isolates each behind an
  interface so the implementation can be swapped without touching
  product code.
- Supabase Auth, Supabase Storage, Supabase Realtime, and Supabase
  Edge Functions are explicitly **not** in use for the MVP. Each is
  a separate CTO decision per the ADR.
