---
name: el-khabir-mobile-ui
description: EL-KHABIR mobile UI conventions. Load for ANY visual/UX change in apps/mobile — screens, cards, states, brand assets, Arabic RTL layout, motion, or accessibility. Encodes the product's premium Arabic-first visual language and the strict local-asset law.
---

# EL-KHABIR — Mobile UI Skill

Project-local conventions for `apps/mobile` (Expo / React Native / Expo Router).
This skill is the authority when the master task and `docs/AGENTS.md` leave a
visual decision open. It does not override functional contracts.

## 1. Product feel

Arabic-first, RTL-first, premium, trustworthy, calm, professional, service-focused.
Modern Egyptian market product. **Not** generic AI-generated UI.

Trust must be *shown*, not claimed: verification, real technicians, clear status,
transparent states, dependable interaction.

## 2. Asset law (hard rules)

- **Zero external images.** No remote URLs, CDNs, stock, placeholders, base64,
  or new image files outside approved libraries.
- All image content comes from the approved local libraries only:
  - Brand 3D system: `apps/mobile/src/assets/brand/**` via
    `apps/mobile/src/ui/brand-assets.ts` (`brandAssets`, `BrandAssetName`).
  - Existing scene WebP system: `apps/mobile/src/ui/scene-assets.ts` — used only
    where already wired and composition genuinely needs it. Do not add new scenes.
- **Never reference a missing asset as if it existed.** Known-missing (never use):
  `fan`, `other-appliance`, `app-icon-concept-01` … `app-icon-concept-06`.
- Known exceptions already in the registry (do not wire without a decision):
  `water-heater1` (competing duplicate), `app-icon` (emblem, not OS icon),
  `pending` (lives under `feature-icons/` but is a status).

## 3. Icon policy

- **Feather** (`@/ui/icon`) owns: navigation chrome, tab bars, common/utility
  actions, direction chevrons, inline status chrome. Keep it.
- **Brand 3D assets** own: appliance categories, features, benefits, trust,
  badges, illustrations, empty states, success/feedback, role selection, visual
  content.
- Do not replace every Feather icon with a 3D asset; do not dump all 68 on Home.
- **Zero emoji** as a UI icon anywhere (trust, warranty, success, nav, errors).

## 4. Rendering transparent brand assets

Default: `resizeMode="contain"`, centered, neutral surface container, predictable
padding, **no tint, no forced crop, no border drawn around the image, no navy fill
behind a transparent asset, no stretch**. Never let one 3D asset dominate a screen.
Prefer the shared primitives: `BrandImage`, `BrandTile` (`@/ui`).

## 5. Design system (reuse, don't fork)

Tokens from `@khabir/ui-tokens`: `color`, `spacing`, `radius`, `shadow`,
`typography`. Reuse existing primitives (`Card`, `Pill`, `Avatar`, `StatusBadge`,
`IconText`, `MenuRow`, `SectionHeader`, `ScreenContainer`, cinematic primitives).
Extend carefully; never create a second styling system or per-screen random styles.
If a pattern appears on 3+ screens, centralize it in `src/ui`.

## 6. Hierarchy & composition

Strong hierarchy, refined spacing (4px rhythm), controlled shadows (`shadow.low`
for cards, `medium` for floating CTA, `high` for dialogs), subtle elevation,
restrained gradients, no visual noise. Content-first cards, one clear primary CTA.
Calm > busy. Empty space is a feature.

## 7. Motion

Subtle, purposeful, smooth. Respect Reduce Motion
(`ReduceMotion.System`, as in `cinematic.tsx`). No decorative animation for its
own sake. Prefer existing primitives (Reanimated already in use).

## 8. RTL (mandatory)

`writingDirection: 'rtl'` + `textAlign: 'right'` on Arabic copy; `direction: 'rtl'`
on RTL rows. Back/forward chevrons mirror correctly. Latin values (email, URLs,
prices, ids) stay LTR-readable — never letter-space Arabic.

## 9. Accessibility

Keep `accessibilityRole` / `accessibilityLabel` / `accessibilityState` on every
interactive element. Never communicate state by color alone (pair with icon/text).
Touch targets ≥ 44px. Contrast per `docs/04_UI_UX.md`. Decorative images are
`accessible={false}` / `importantForAccessibility="no"`.

## 10. State coverage

Every list/screen intentionally handles: loading, loaded, empty, error, success,
disabled, pending, active, completed, cancelled. Use the shared
`ListLoading` / `ListEmpty` / `ListError` (`features/customer/components/list-state-view.tsx`)
with brand empty-state assets. No generic placeholder where a real state exists.

## 11. Performance

Static imports, sized WebP, memoize only when justified, avoid new inline style
objects in hot paths, and do not preload all assets globally.

## 12. Engineering guardrails

Never change API routes/payloads/contracts, auth, lifecycle rules, subscriptions,
permissions, notification semantics, or DB schema. Modify the existing app; do
not rebuild it. Keep every existing test passing. Mobile only — never touch
`apps/admin` or `apps/landing`.
