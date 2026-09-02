# الخبير — Al-Khabir

> Premium, Arabic-first (RTL) home-appliance service platform.
> غسالات · ثلاجات · تكييفات

A multi-role mobile application, a marketing Landing Page, an internal Admin Dashboard, and a shared Backend + PostgreSQL database. The product is governed by the [constitution](./docs/) and supported by [Architecture Decision Records](./docs/adr/).

---

## Role hierarchy

```
Product Owner              (business priorities, commercial decisions)
   ↓
CTO / Technical Lead       (architecture, quality, security, approvals)
   ↓
Implementation Agent       (repository work, scoped implementation)
   ↓
Repository                 (code, tests, docs, ADRs)
```

> **Do not implement features outside the constitution or approved scope without CTO approval.**
> See `docs/10_ENGINEERING_RULES.md` §3, §9, §10, §37, §38.

---

## High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Expo (React Native)   Next.js Admin   Next.js Landing       │
│  + packages/ui-tokens  + ui-tokens     + ui-tokens           │
│  + packages/shared-types/validation                           │
└────────────────┬──────────────────┬───────────────┬──────────┘
                 │ HTTPS /api/v1    │               │
                 ▼                  ▼               ▼
            ┌────────────────────────────────────────────────┐
            │       NestJS API (single deploy)              │
            │   packages/shared-types · shared-validation   │
            └────────────────┬───────────────────────────────┘
                             │ Prisma
                             ▼
            ┌────────────────────────────────────────────────┐
            │  PostgreSQL 15 + PostGIS · Object storage      │
            └────────────────────────────────────────────────┘
```

The constitution (`docs/01..10`) is the engineering source of truth. The API contract (`docs/07_API.md`) is authoritative. OpenAPI export and generated client types are derived artifacts only.

---

## Monorepo structure

```
.
├── apps/
│   ├── api/              NestJS backend
│   ├── mobile/           Expo + React Native (Expo Router)
│   ├── admin/            Next.js (App Router) — internal dashboard
│   └── landing/          Next.js — marketing site
├── packages/
│   ├── ui-tokens/        Design tokens (color, spacing, radius, shadow, type)
│   ├── shared-types/     Generated/hand-written DTOs and enums
│   ├── shared-validation/ zod schemas shared by API + clients
│   └── config/           Shared ESLint, Prettier, TypeScript presets
├── docs/
│   ├── 01..10_*.md       Constitution (authoritative)
│   └── adr/              Architecture Decision Records
└── .github/workflows/    CI
```

UI primitives are **platform-specific** and live in each app's `src/components/`. The design tokens and shared types/validation are the only cross-platform shared surface.

---

## Prerequisites

- Node.js `>= 20.11.0` (see `.nvmrc`)
- pnpm `>= 11` (enable via `corepack enable`)
- PostgreSQL `>= 15` with PostGIS (for `apps/api` runtime; not required for this bootstrap task)

---

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install all workspace dependencies |
| `pnpm typecheck` | Typecheck every workspace (Turbo) |
| `pnpm lint` | Lint every workspace (Turbo) |
| `pnpm format` | Format the repo with Prettier |
| `pnpm format:check` | Verify formatting |
| `pnpm build` | Build every workspace |
| `pnpm test` | Run tests across workspaces |
| `pnpm dev` | Start every dev server in parallel (Turbo) |
| `pnpm clean` | Remove build outputs and `node_modules` |

Per-app commands are listed in each `apps/*/README.md` or `package.json`.

---

## Constitution & ADRs

- Constitution: `docs/01..10_*.md` — read these before any non-trivial change.
- ADRs: `docs/adr/` — every significant architectural decision is recorded here.

---

## Project status

This repository is at **Task #002 — Environment + Database + Auth Foundation**.
- Monorepo, all four apps, and shared packages are wired.
- Authentication foundation (register / login / refresh / logout / /me) is implemented with RBAC, hashed passwords, rotated refresh tokens, and rate limiting.
- Admin auth is on a separate authority boundary (separate JWT secret/issuer/audience).
- Mobile API client + SecureStore-backed auth store are in place.
- Real unit tests (23) cover password hashing, token generation, policy, and validation.
- An e2e test (auth.e2e.spec.ts) is authored and ready to run once the local database is available and the vitest+NestJS transform is finalised.

**Database requirement (Task #002 amendment):** PostgreSQL 15+ with the PostGIS extension must be installed **natively** on the development machine. Docker / Docker Compose is not used for the local database in this phase. See `docs/local-dev.md` for the exact prerequisites and setup commands.

The next task is proposed in the Task #002 final report, not executed.
