# ADR-0001: Locked Technology Stack

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** CTO / Technical Lead

## Context

The الخبير platform is a greenfield build. The constitution requires a single multi-role mobile app, a marketing Landing Page, an internal Admin Dashboard, a Backend API, and a Database (`docs/01_PROJECT.md` §2; `docs/05_TECH_ARCHITECTURE.md` §1, §2). Selection criteria called out in `05` §2: strong Arabic/RTL support, mobile capability, mature auth/session libraries, typed API/data validation, production-grade migrations, efficient AI-assisted development, good testing ecosystem, low operational complexity for MVP.

The CTO selected the stack during plan approval. This ADR records the lock-in and the rationale.

## Decision

| Layer | Choice |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| Mobile | Expo + React Native + TypeScript + Expo Router |
| Backend | NestJS + TypeScript |
| Admin | Next.js (App Router) + TypeScript |
| Landing | Next.js + TypeScript |
| Database | PostgreSQL 15+ with PostGIS |
| ORM | Prisma |
| Shared packages | `packages/ui-tokens`, `packages/shared-types`, `packages/shared-validation`, `packages/config` |
| Auth (locked later) | short-lived access token + httpOnly refresh cookie, validated server-side |
| Validation | zod (shared across API + clients) |
| Notification delivery | `NotificationService` interface; Expo Push adapter for MVP |
| Payments | deferred; admin-activatable subscriptions allowed for staging only |
| Analytics | event abstraction only for MVP |
| Object storage | S3-compatible; provider TBD |
| Testing | Vitest, Supertest, React Native Testing Library + Maestro, Playwright |
| CI | GitHub Actions: install, typecheck, lint |

## Rationale

- **pnpm + Turborepo** — first-class workspaces, deterministic installs, fast cache, low ceremony.
- **Expo + RN + Expo Router** — first-class RTL, OTA-ready, file-based routing, large talent pool, EAS for build/submit.
- **NestJS** — opinionated modular structure maps 1:1 to `05` §4 module boundaries; first-class TypeScript; strong DI for the central `can()` policy module.
- **Next.js for Admin and Landing** — same framework for both reduces cognitive load; RSC + server actions for Admin data work; static-first for Landing.
- **PostgreSQL + PostGIS** — geospatial search is required for technician matching; PostGIS provides mature `ST_DWithin` and GiST indexes.
- **Prisma** — typed client, migration tooling, plays well with NestJS; PostGIS columns handled via `Unsupported(...)` plus raw SQL helpers.
- **Shared packages are deliberately small** — only tokens, types, validation, and config. UI primitives are platform-specific per CTO correction.

## Constraints

- No alternative framework substitutions unless a concrete blocker is discovered and approved by the CTO.
- Architecture freeze rule (`05` §27) applies once implementation begins.
- No new dependency is added without verifying an existing one does not already solve the problem (`10` §25).

## Consequences

- Onboarding docs, ADRs, and CI must reflect this stack.
- Any future framework change requires a new ADR and CTO approval.
- Mobile platforms share types with backend via `packages/shared-types`; UI primitives do not cross platform boundaries.

## References

- `docs/05_TECH_ARCHITECTURE.md` §2
- `docs/10_ENGINEERING_RULES.md` §25, §27
