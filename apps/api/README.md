# @khabir/api

NestJS backend for الخبير. Authoritative source for identity, roles, permissions, subscriptions, and order state (per `docs/05_TECH_ARCHITECTURE.md` and `docs/10_ENGINEERING_RULES.md` §15).

## Prerequisites

- Node.js 22.11.0 (see `docs/local-dev.md` §2)
- pnpm 10.4.0
- PostgreSQL 15+ with PostGIS installed **natively** on the developer machine
  (Docker is not used for the local database in this phase, per the Task #002
  CTO amendment)

## Environment

Copy `.env.example` to `.env` and fill in real values. The minimum required
variables are `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `ADMIN_JWT_ACCESS_SECRET`.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start dev server with watch (port 3000) |
| `pnpm build` | Build to `dist/` |
| `pnpm start` | Run compiled output |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm prisma:generate` | Generate the Prisma client |
| `pnpm prisma:migrate:dev` | Create + apply a migration in development |
| `pnpm prisma:migrate:deploy` | Apply existing migrations (staging/production) |
| `pnpm prisma:studio` | Open Prisma Studio |
| `pnpm db:seed` | Run the development seed script |

## Endpoints

Under `http://localhost:3000/api/v1`:

- `GET /health` — liveness
- `GET /ready` — readiness (database check)
- `POST /auth/register` — register a user
- `POST /auth/login` — log in
- `POST /auth/refresh` — rotate the refresh token
- `POST /auth/logout` — revoke the refresh family
- `GET /me` — current user (Bearer access token)
- `POST /admin/auth/login` — admin login (separate JWT authority)
- `POST /admin/auth/refresh` — admin refresh
- `POST /admin/auth/logout` — admin logout
- `GET /admin/me` — current admin (Bearer admin access token)

## Notes

- `prisma db push` is **not** used. Schema changes go through migrations.
- The mobile app uses `EXPO_PUBLIC_API_URL`; the Admin and Landing apps
  will use `NEXT_PUBLIC_API_URL` in later tasks.
- See `docs/local-dev.md` for the full local setup, reset procedure, and
  troubleshooting.
