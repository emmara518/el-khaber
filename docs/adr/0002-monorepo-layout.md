# ADR-0002: Monorepo Layout and Package/App Boundaries

- **Status:** Accepted
- **Date:** 2026-09-02
- **Deciders:** CTO / Technical Lead

## Context

Five engineering tracks run in parallel: backend, mobile, admin, landing, and shared foundations. The constitution mandates a single multi-role app plus a Landing Page and an Admin Dashboard. The CTO corrected the earlier plan: shared packages are limited to tokens, types, validation, and config; **UI primitives are platform-specific**.

## Decision

```
.
├── apps/
│   ├── api/        NestJS backend
│   ├── mobile/     Expo + React Native (Expo Router)
│   ├── admin/      Next.js (App Router) — internal dashboard
│   └── landing/    Next.js — marketing site
├── packages/
│   ├── ui-tokens/        colors, spacing, radius, shadows, typography
│   ├── shared-types/     DTOs, enums, role/permission keys
│   ├── shared-validation/ zod schemas shared by API + clients
│   └── config/           ESLint, Prettier, TypeScript presets
├── docs/
│   ├── 01..10_*.md       Constitution
│   └── adr/              Architecture Decision Records
└── .github/workflows/    CI
```

### Package boundaries

- **`packages/ui-tokens`** — single TS source of design tokens. Imported by `apps/mobile`, `apps/admin`, `apps/landing`. No rendering logic.
- **`packages/shared-types`** — DTOs, enums (role, permission, plan code, error code), and zero-runtime constants. Built first; consumed by every app.
- **`packages/shared-validation`** — zod schemas for the same DTOs, consumed by NestJS (`ZodValidationPipe`) and by mobile/admin forms. One source of truth.
- **`packages/config`** — preset ESLint flat config, Prettier config, base TypeScript config. Each app extends rather than duplicates.

### App boundaries

- **No UI component package is shared between React Native and Next.js.** Primitives live in:
  - `apps/mobile/src/components`
  - `apps/admin/src/components`
  - `apps/landing/src/components`
- The API package owns business logic; the apps consume the API and never duplicate domain rules.
- The Constitution (`docs/`) is the engineering source of truth; ADRs are the source of truth for *how* the constitution is implemented.

### Forbidden

- Importing a React component from `apps/admin` or `apps/landing` into `apps/mobile` (or vice versa).
- Importing a React component from one app into a shared package.
- Duplicating design tokens outside `packages/ui-tokens`.
- Hand-typing DTOs in clients when `packages/shared-types` defines them.

## Rationale

- Sharing only tokens, types, validation, and config avoids the cross-platform rendering pitfalls that arise from trying to maintain a single UI library for React Native and Next.js.
- TypeScript types and zod schemas naturally cross the platform boundary because they are zero-runtime.
- ESLint/TS/Prettier presets eliminate per-app configuration drift.

## Consequences

- Every screen, feature, and component is implemented in its consuming app.
- Token changes require a Turbo rebuild for all consuming apps.
- Adding a new package requires an ADR update.

## References

- `docs/05_TECH_ARCHITECTURE.md` §4
- `docs/10_ENGINEERING_RULES.md` §11, §25
