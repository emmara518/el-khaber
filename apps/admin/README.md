# @khabir/admin

Internal admin dashboard for الخبير. Next.js App Router. Permission groups per `docs/09_ADMIN.md` §3.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm --filter @khabir/admin dev` | Dev server on `http://localhost:3001` |
| `pnpm --filter @khabir/admin build` | Production build |
| `pnpm --filter @khabir/admin start` | Run production build |
| `pnpm --filter @khabir/admin typecheck` | TypeScript check |
| `pnpm --filter @khabir/admin lint` | ESLint |

Admin modules (users, technicians, merchants, appliances, faults, services, requests, reviews, subscriptions, notifications, content, audit) are added in later tasks.
