# @khabir/mobile

Expo + React Native mobile app for الخبير. Single multi-role app for `customer`, `technician`, and `merchant`. RTL-first. Uses Expo Router for file-based navigation.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm --filter @khabir/mobile dev` | Start Expo dev server |
| `pnpm --filter @khabir/mobile ios` | iOS simulator |
| `pnpm --filter @khabir/mobile android` | Android emulator |
| `pnpm --filter @khabir/mobile web` | Web bundle |
| `pnpm --filter @khabir/mobile build` | Export for distribution |
| `pnpm --filter @khabir/mobile typecheck` | TypeScript check |
| `pnpm --filter @khabir/mobile lint` | ESLint |

## Structure

- `app/` — Expo Router file-based routes
- `app/_layout.tsx` — root layout (RTL stack)
- `app/index.tsx` — bootstrap screen

Product screens are added in later tasks per `docs/02_PRODUCT.md` and `docs/03_USER_FLOWS.md`.
